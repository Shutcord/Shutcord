# Shutcord Installer

Installer for [Shutcord](https://github.com/Shutcord/Shutcord). Based on Vencord's installer (GPL-3.0), with a new window UI.

- Double-click `ShutcordInstaller.exe`: a window opens in your browser (served from 127.0.0.1 only, protected by a random token).
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
