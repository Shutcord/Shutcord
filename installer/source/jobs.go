//go:build cli

package main

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
)

type jobStep struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	State string `json:"state"` // pending | active | done | error
}

type job struct {
	id    string
	mu    sync.Mutex
	kind  string
	steps []jobStep
	done  bool
	ok    bool
	err   string
}

var (
	jobs   = map[string]*job{}
	jobsMu sync.Mutex
)

func newJob(kind string) *job {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	j := &job{id: hex.EncodeToString(b), kind: kind}
	if kind == "install" {
		j.steps = []jobStep{
			{"close", "Closing Discord", "pending"},
			{"download", "Downloading Shutcord", "pending"},
			{"patch", "Patching Discord", "pending"},
		}
	} else {
		j.steps = []jobStep{
			{"close", "Closing Discord", "pending"},
			{"restore", "Restoring original Discord", "pending"},
		}
	}
	jobsMu.Lock()
	jobs[j.id] = j
	jobsMu.Unlock()
	return j
}

func getJob(id string) *job {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	return jobs[id]
}

func (j *job) set(id, state string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	for i := range j.steps {
		if j.steps[i].ID == id {
			j.steps[i].State = state
		}
	}
}

func (j *job) finish(err error) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.done = true
	if err == nil {
		j.ok = true
		return
	}
	for i := range j.steps {
		if j.steps[i].State == "active" {
			j.steps[i].State = "error"
		}
	}
	msg := err.Error()
	if errors.Is(err, os.ErrPermission) {
		msg = "Permission denied. Close Discord completely and try again (run the installer as administrator if Discord is installed system-wide)."
	}
	j.err = msg
}

func (j *job) snapshot() map[string]any {
	j.mu.Lock()
	defer j.mu.Unlock()
	steps := make([]jobStep, len(j.steps))
	copy(steps, j.steps)
	return map[string]any{"ok": true, "kind": j.kind, "steps": steps, "done": j.done, "success": j.ok, "error": j.err}
}

func runJob(j *job, kind string, di *DiscordInstall, prepareFiles func() error) {
	j.set("close", "active")
	PreparePatch(di)
	j.set("close", "done")

	if kind == "install" {
		j.set("download", "active")
		if err := prepareFiles(); err != nil {
			Log.Error("install failed:", err)
			j.finish(err)
			return
		}
		j.set("download", "done")

		j.set("patch", "active")
		if err := di.patch(); err != nil {
			Log.Error("install failed:", err)
			j.finish(err)
			return
		}
		j.set("patch", "done")
		j.finish(nil)
		return
	}

	j.set("restore", "active")
	if err := di.unpatch(); err != nil {
		Log.Error("uninstall failed:", err)
		j.finish(err)
		return
	}
	j.set("restore", "done")
	j.finish(nil)
}

func launchDiscord(di *DiscordInstall) error {
	switch runtime.GOOS {
	case "windows":
		exeName := filepath.Base(di.path) // Discord, DiscordCanary, DiscordPTB ...
		update := filepath.Join(di.path, "Update.exe")
		if !ExistsFile(update) {
			return errors.New("Update.exe not found in " + di.path)
		}
		return exec.Command(update, "--processStart", exeName+".exe").Start()
	default:
		return errors.New("Start Discord yourself from your applications menu")
	}
}
