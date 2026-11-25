# Shutcord Installer

`ShutcordInstaller.exe` opens a fixed-size window (WebView2, no maximize, no minimize, dark title bar). If WebView2 is missing it falls back to an Edge/Chrome app window. Set `SHUTCORD_BROWSER` to force a browser.

Installer for [Shutcord](https://github.com/Shutcord/Shutcord). Based on Vencord's installer (GPL-3.0), with a new window UI.

- Double-click `ShutcordInstaller.exe`: opens the installer in its own app window (Edge/Chrome app mode, served from 127.0.0.1 only, protected by a random token). Set `SHUTCORD_BROWSER` to force a browser.
- `ShutcordInstallerCli.exe --install|--uninstall|--repair [--branch stable|ptb|canary]`: command line.
- `--menu`: the old text menu.

It detects Shutcord installs by a marker in Discord's `app.asar`. Another mod such as Vencord is shown as such and replaced on install.

## Build
```sh
# console version (what `pnpm inject` uses)
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -tags "static cli" -ldflags "-s -w" -o ShutcordInstallerCli.exe .
# windowed version, no console window
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -tags "static cli" -ldflags "-s -w -H=windowsgui" -o ShutcordInstaller.exe .
```
The UI is `web/index.html` (embedded into the exe at build time).

Where it downloads Shutcord from: `constants.go` (`ReleaseUrl`). Self-update: `self_updater.go`.


The Windows icon and manifest are embedded from `rsrc_windows_amd64.syso` (made from `assets/icon.ico` with github.com/akavel/rsrc, `rsrc -manifest app.manifest -ico icon.ico -arch amd64 -o rsrc_windows_amd64.syso`).

## License screen, custom folders

- First launch shows a license agreement (tick "I accept", then Next). Acceptance is stored in
  `<user config dir>/Shutcord/installer-license-accepted-v1`; delete that file to see it again.
  The footer "License" link reopens it any time.
- Cards are always ordered Stable, PTB, Canary, Dev, then custom folders in the order added.
- Folders added with "+ Custom folder" have a "custom" tag and an x button to remove them from the list
  (this never deletes anything on disk).
