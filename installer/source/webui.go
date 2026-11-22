//go:build cli

package main

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"shutcordinstaller/buildinfo"
)

//go:embed web/index.html
var indexHtml []byte

type apiInstall struct {
	ID       string `json:"id"`
	Branch   string `json:"branch"`
	Path     string `json:"path"`
	Shutcord bool   `json:"shutcord"`
	Other    string `json:"other"`
}

type apiState struct {
	Version   string       `json:"version"`
	Installs  []apiInstall `json:"installs"`
	DataDir   string       `json:"dataDir"`
	Dev       bool         `json:"dev"`
	LatestOk  bool         `json:"latestOk"`
	LatestErr string       `json:"latestErr"`
	Latest    string       `json:"latest"`
	Installed string       `json:"installed"`
	OS        string       `json:"os"`
	Release   string       `json:"release"`
	Update    bool         `json:"update"`
}

type apiResult struct {
	Ok      bool   `json:"ok"`
	Message string `json:"message"`
}

var customInstalls []*DiscordInstall
var opLock sync.Mutex

func toApi(di *DiscordInstall) apiInstall {
	return apiInstall{
		ID:       di.path,
		Branch:   di.branch,
		Path:     di.path,
		Shutcord: di.isPatched,
		Other:    di.foreignMod(),
	}
}

// re-read install state from disk so the UI never shows stale info
func refreshedInstalls() []*DiscordInstall {
	var out []*DiscordInstall
	seen := map[string]bool{}
	for _, d := range FindDiscords() {
		di := d.(*DiscordInstall)
		out = append(out, di)
		seen[di.path] = true
	}
	for _, c := range customInstalls {
		if seen[c.path] {
			continue
		}
		if fresh := ParseDiscord(c.path, c.branch); fresh != nil {
			out = append(out, fresh)
		} else if fresh := ParseDiscordNew(c.path, c.branch, c.isFlatpak); fresh != nil {
			out = append(out, fresh)
		}
	}
	return out
}

func findInstall(id string) *DiscordInstall {
	for _, di := range refreshedInstalls() {
		if di.path == id {
			return di
		}
	}
	return nil
}

func runWebUI() {
	tokenBytes := make([]byte, 16)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		die("Could not start the installer UI: " + err.Error())
	}
	port := ln.Addr().(*net.TCPAddr).Port
	allowedHost := fmt.Sprintf("127.0.0.1:%d", port)

	githubReady := make(chan struct{})
	githubOK := false
	go func() {
		githubOK = <-GithubDoneChan
		close(githubReady)
	}()

	var lastPing atomicTime
	lastPing.Store(time.Now())
	pinged := false
	quit := make(chan struct{})
	var quitOnce sync.Once
	doQuit := func() { quitOnce.Do(func() { close(quit) }) }

	mux := http.NewServeMux()

	guard := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// block DNS-rebinding and other websites poking at localhost
			if r.Host != allowedHost || r.Header.Get("X-Token") != token {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			h(w, r)
		}
	}
	reply := func(w http.ResponseWriter, v any) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(v)
	}
	fail := func(w http.ResponseWriter, msg string) { reply(w, apiResult{false, msg}) }

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" || r.Host != allowedHost || r.URL.Query().Get("t") != token {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(indexHtml)
	})

	mux.HandleFunc("/api/ping", guard(func(w http.ResponseWriter, r *http.Request) {
		pinged = true
		lastPing.Store(time.Now())
		reply(w, apiResult{true, "pong"})
	}))

	mux.HandleFunc("/api/state", guard(func(w http.ResponseWriter, r *http.Request) {
		st := apiState{Version: buildinfo.InstallerTag, DataDir: BaseDir, Dev: IsDevInstall, OS: runtime.GOOS}
		st.Installed = InstalledHash
		st.Latest = LatestHash
		ready := false
		select {
		case <-githubReady:
			ready = true
		default:
		}
		st.LatestOk = IsDevInstall || (ready && githubOK && len(ReleaseData.Assets) > 0)
		if !ready {
			st.LatestErr = "checking"
		}
		st.Release = ReleaseData.Name
		st.Update = !IsDevInstall && ready && githubOK && InstalledHash != "" && InstalledHash != "None" && InstalledHash != LatestHash
		if ready && GithubError != nil {
			st.LatestErr = GithubError.Error()
		}
		for _, di := range refreshedInstalls() {
			st.Installs = append(st.Installs, toApi(di))
		}
		if st.Installs == nil {
			st.Installs = []apiInstall{}
		}
		reply(w, st)
	}))

	mux.HandleFunc("/api/custom", guard(func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Path string }
		_ = json.NewDecoder(r.Body).Decode(&body)
		p := strings.TrimSpace(strings.Trim(body.Path, `"`))
		di := ParseDiscord(p, "")
		if di == nil {
			di = ParseDiscordNew(p, "", strings.Contains(p, "com.discordapp"))
		}
		if di == nil {
			fail(w, "That folder isn't a valid Discord install.")
			return
		}
		customInstalls = append(customInstalls, di)
		reply(w, apiResult{true, di.path})
	}))

	prepareFiles := func() error {
		if IsDevInstall {
			return nil
		}
		select {
		case <-githubReady:
		case <-time.After(25 * time.Second):
			return errors.New("Timed out while contacting GitHub")
		}
		if !githubOK {
			msg := "Couldn't fetch the latest Shutcord release"
			if GithubError != nil {
				msg += " (" + GithubError.Error() + ")"
			}
			return errors.New(msg + ". Make sure the Shutcord repo is public and has a published release.")
		}
		return installLatestBuilds()
	}

	startJob := func(kind string) http.HandlerFunc {
		return guard(func(w http.ResponseWriter, r *http.Request) {
			var body struct{ ID string }
			_ = json.NewDecoder(r.Body).Decode(&body)
			di := findInstall(body.ID)
			if di == nil {
				fail(w, "Couldn't find that Discord install anymore.")
				return
			}
			j := newJob(kind)
			go func() {
				opLock.Lock()
				defer opLock.Unlock()
				runJob(j, kind, di, prepareFiles)
			}()
			reply(w, map[string]any{"ok": true, "job": j.id})
		})
	}
	mux.HandleFunc("/api/install", startJob("install"))
	mux.HandleFunc("/api/uninstall", startJob("uninstall"))

	mux.HandleFunc("/api/job", guard(func(w http.ResponseWriter, r *http.Request) {
		j := getJob(r.URL.Query().Get("id"))
		if j == nil {
			fail(w, "unknown job")
			return
		}
		reply(w, j.snapshot())
	}))

	mux.HandleFunc("/api/launch", guard(func(w http.ResponseWriter, r *http.Request) {
		var body struct{ ID string }
		_ = json.NewDecoder(r.Body).Decode(&body)
		di := findInstall(body.ID)
		if di == nil {
			fail(w, "Couldn't find that Discord install anymore.")
			return
		}
		if err := launchDiscord(di); err != nil {
			fail(w, err.Error())
			return
		}
		reply(w, apiResult{true, "launched"})
	}))

	mux.HandleFunc("/api/open", guard(func(w http.ResponseWriter, r *http.Request) {
		var body struct{ URL string }
		_ = json.NewDecoder(r.Body).Decode(&body)
		if !strings.HasPrefix(body.URL, "https://github.com/Shutcord/") {
			fail(w, "not allowed")
			return
		}
		openDefaultBrowser(body.URL)
		reply(w, apiResult{true, "opened"})
	}))

	mux.HandleFunc("/api/quit", guard(func(w http.ResponseWriter, r *http.Request) {
		reply(w, apiResult{true, "bye"})
		go func() { time.Sleep(200 * time.Millisecond); doQuit() }()
	}))

	srv := &http.Server{Handler: mux}
	go func() { _ = srv.Serve(ln) }()

	url := fmt.Sprintf("http://%s/?t=%s", allowedHost, token)
	fmt.Println("Shutcord Installer is running at", url)
	if os.Getenv("SHUTCORD_BROWSER") == "" && runNativeWindow(url) {
		_ = srv.Close()
		return
	}

	started := time.Now()
	win := openAppWindow(url)
	if win != nil {
		// closing the window closes the installer
		go func() {
			_ = win.Wait()
			if time.Since(started) > 4*time.Second {
				doQuit()
			}
		}()
	}

	// exit once the browser tab is closed
	go func() {
		for range time.Tick(2 * time.Second) {
			idle := time.Since(lastPing.Load())
			if (pinged && idle > 20*time.Second) || (!pinged && idle > 2*time.Minute) {
				doQuit()
				return
			}
		}
	}()

	<-quit
	if win != nil && win.Process != nil {
		_ = win.Process.Kill()
	}
	_ = srv.Close()
}

// browserCandidates returns Chromium-based browsers that can open an app-style window
func browserCandidates() []string {
	var c []string
	if v := os.Getenv("SHUTCORD_BROWSER"); v != "" {
		c = append(c, v)
	}
	switch runtime.GOOS {
	case "windows":
		pf, pf86, local := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LocalAppData")
		for _, base := range []string{pf86, pf, local} {
			if base == "" {
				continue
			}
			c = append(c,
				base+`\Microsoft\Edge\Application\msedge.exe`,
				base+`\Google\Chrome\Application\chrome.exe`,
				base+`\BraveSoftware\Brave-Browser\Application\brave.exe`,
				base+`\Chromium\Application\chrome.exe`,
			)
		}
	case "darwin":
		c = append(c,
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
		)
	default:
		for _, n := range []string{"microsoft-edge", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser"} {
			if p, err := exec.LookPath(n); err == nil {
				c = append(c, p)
			}
		}
	}
	return c
}

// openAppWindow opens the UI in its own standalone window (no tabs, no address bar).
// Returns the browser process, or nil if it had to fall back to a normal browser tab.
func openAppWindow(url string) *exec.Cmd {
	profile := filepath.Join(os.TempDir(), "shutcord-installer-profile")
	for _, exe := range browserCandidates() {
		if !ExistsFile(exe) {
			continue
		}
		cmd := exec.Command(exe,
			"--app="+url,
			"--user-data-dir="+profile, // own instance, so the process lives exactly as long as the window
			"--window-size=1040,700",
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-extensions",
			"--disable-features=Translate",
		)
		if err := cmd.Start(); err != nil {
			Log.Debug("Failed to start", exe, err)
			continue
		}
		Log.Debug("Opened app window with", exe)
		return cmd
	}

	openDefaultBrowser(url)
	return nil
}

func openDefaultBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		Log.Warn("Couldn't open a window automatically. Open this link yourself:", url)
	}
}

type atomicTime struct {
	mu sync.Mutex
	t  time.Time
}

func (a *atomicTime) Store(t time.Time) { a.mu.Lock(); a.t = t; a.mu.Unlock() }
func (a *atomicTime) Load() time.Time   { a.mu.Lock(); defer a.mu.Unlock(); return a.t }
