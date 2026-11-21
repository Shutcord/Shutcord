/*
 * SPDX-License-Identifier: GPL-3.0
 * Shutcord Installer, a cross platform gui/cli app for installing Shutcord
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

package main

import (
	"errors"
	"os"
	path "path/filepath"
	"strings"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var windowsNames = map[string]string{
	"stable": "Discord",
	"ptb":    "DiscordPTB",
	"canary": "DiscordCanary",
	"dev":    "DiscordDevelopment",
}

var killLock sync.Mutex

func ParseDiscordNew(p, branch string, isFlatpak bool) *DiscordInstall {
	return nil
}

func ParseDiscord(p, branch string) *DiscordInstall {
	entries, err := os.ReadDir(p)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			Log.Warn("Error during readdir "+p+":", err)
		}
		return nil
	}

	isPatched := false
	resourcesPath := ""
	for _, dir := range entries {
		if dir.IsDir() && strings.HasPrefix(dir.Name(), "app-") {
			resources := path.Join(p, dir.Name(), "resources")
			if !ExistsFile(resources) {
				continue
			}
			if resources > resourcesPath {
				resourcesPath = resources
				isPatched = isResourcesFolderPatched(resources)
			}
		}
	}

	if resourcesPath == "" {
		return nil
	}

	if branch == "" {
		branch = GetBranch(p)
	}

	return &DiscordInstall{
		path:          p,
		branch:        branch,
		resourcesPath: resourcesPath,
		isPatched:     isPatched,
		isFlatpak:     false,
	}
}

func FindDiscords() []any {
	var discords []any

	appData := os.Getenv("LOCALAPPDATA")
	if appData == "" {
		Log.Error("%LOCALAPPDATA% is empty???????")
		return discords
	}

	for branch, dirname := range windowsNames {
		p := path.Join(appData, dirname)
		if discord := ParseDiscord(p, branch); discord != nil {
			Log.Debug("Found Discord install at ", p)
			discords = append(discords, discord)
		}
	}
	return discords
}

func PreparePatch(di *DiscordInstall) {
	killLock.Lock()
	defer killLock.Unlock()

	name := windowsNames[di.branch]
	Log.Debug("Trying to kill", name)
	// Discord runs many processes, kill every one of them or app.asar stays locked
	for i := 0; i < 40; i++ {
		pid := findProcessIdByName(name + ".exe")
		if pid == 0 {
			Log.Debug("No (more) processes matching name")
			return
		}

		proc, err := os.FindProcess(int(pid))
		if err != nil {
			Log.Warn("Failed to find process with pid", pid)
			return
		}

		if err = proc.Kill(); err != nil {
			Log.Warn("Failed to kill", name+":", err)
			return
		}
		_, _ = proc.Wait()
	}
}

func FixOwnership(_ string) error {
	return nil
}

// https://github.com/Shutcord/ShutcordInstaller/issues/9

func CheckScuffedInstall() bool {
	username := os.Getenv("USERNAME")
	programData := os.Getenv("PROGRAMDATA")
	for _, discordName := range windowsNames {
		if ExistsFile(path.Join(programData, username, discordName)) || ExistsFile(path.Join(programData, username, discordName)) {
			HandleScuffedInstall()
			return true
		}
	}
	return false
}

func findProcessIdByName(name string) uint32 {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return 0
	}

	procEntry := windows.ProcessEntry32{Size: uint32(unsafe.Sizeof(windows.ProcessEntry32{}))}
	for {
		err = windows.Process32Next(snapshot, &procEntry)
		if err != nil {
			return 0
		}
		if windows.UTF16ToString(procEntry.ExeFile[:]) == name {
			return procEntry.ProcessID
		}
	}
}
