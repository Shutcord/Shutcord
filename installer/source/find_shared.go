package main

import (
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

// Marker written into the index.js of every app.asar we create.
// It lets us tell our own patch apart from a Vencord / Equicord / etc. patch.
const PatchMarker = "SHUTCORD_PATCH"

var requireRe = regexp.MustCompile(`require\(("(?:[^"\\]|\\.)*")\)`)

func isResourcesFolderValid(dir string) bool {
	return ExistsFile(path.Join(dir, "app.asar"))
}

// readPatchTarget returns the raw app.asar content and the path it require()s, if any
func readPatchTarget(dir string) (content string, target string) {
	b, err := os.ReadFile(filepath.Join(dir, "app.asar"))
	if err != nil || len(b) > 1<<20 {
		return "", ""
	}
	content = string(b)
	if m := requireRe.FindStringSubmatch(content); m != nil {
		t := strings.ReplaceAll(m[1][1:len(m[1])-1], `\\`, `\`)
		target = t
	}
	return
}

// isResourcesFolderPatched is true only if the install is patched by Shutcord.
func isResourcesFolderPatched(dir string) bool {
	if !ExistsFile(path.Join(dir, "_app.asar")) {
		return false
	}
	content, target := readPatchTarget(dir)
	if strings.Contains(content, PatchMarker) {
		return true
	}
	// Installs patched by an older Shutcord build (no marker): <something>/Shutcord/dist/patcher.js
	if target != "" {
		norm := strings.ReplaceAll(target, "\\", "/")
		return strings.EqualFold(path.Base(path.Dir(path.Dir(norm))), "shutcord")
	}
	return false
}

// foreignModName returns the name of another mod that patched this install ("" if none)
func foreignModName(dir string) string {
	if !ExistsFile(path.Join(dir, "_app.asar")) || isResourcesFolderPatched(dir) {
		return ""
	}
	_, target := readPatchTarget(dir)
	l := strings.ToLower(target)
	switch {
	case strings.Contains(l, "equicord"):
		return "Equicord"
	case strings.Contains(l, "vencord"):
		return "Vencord"
	case strings.Contains(l, "betterdiscord"):
		return "BetterDiscord"
	}
	return "another client mod"
}

func (di *DiscordInstall) foreignMod() string {
	return foreignModName(di.resourcesPath)
}
