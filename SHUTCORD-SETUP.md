# Shutcord setup

Shutcord is a rebrand of Vencord (GPL-3.0). Keep `LICENSE` and the copyright headers in the source files.
Editing the settings screen: `docs/EDITING-THE-UI.md`. Logos: `assets/`.

## Links: everything points to GitHub
The only website is the GitHub repo, `https://github.com/Shutcord/Shutcord`. If you rename the org or repo, search the project for `Shutcord/Shutcord` and replace it. The main places:

| What | File |
|---|---|
| Donate button | `src/components/settings/DonateButton.tsx` (and the badge popup in `src/plugins/_api/badges/index.tsx`) |
| "Official builds" links (support helper) | `src/plugins/_core/supportHelper.tsx` |
| Issue templates | `.github/ISSUE_TEMPLATE/*` |
| Installer download URLs | `installer/source/constants.go` |
| Installer UI links | `installer/source/web/index.html` |
| Package metadata | `package.json`, `browser/manifest*.json`, `browser/userscript.meta.js` |

The in-app updater uses your real `git remote origin` at build time.

## Donations
There is no payment code in the client. Money goes through GitHub Sponsors; perks ($1 / $5 / $10 / $25 tiers with 0 / 1 / 2 / 5 badges) are handed out by editing `sponsors.json` with `pnpm sponsors add ...`. Full guide: `docs/SPONSORS.md`.

## Cloud sync
Off by default and unavailable: its address is a placeholder (`cloud.shutcord.invalid`, in `src/api/Settings.ts`). To use it you must host a backend (the open-source one is at https://github.com/Vencord/Backend) and put its address there.

## Installer
Prebuilt in `installer/`:
- `ShutcordInstaller.exe`: the installer window.
- `ShutcordInstallerCli.exe`: command line, used by `pnpm inject` and `pnpm uninject`.

Source: `installer/source` (UI: `web/index.html`, window: `window_windows.go`). Build commands are in `installer/source/README.md`.

It downloads `patcher.js`, `preload.js`, `renderer.js`, `renderer.css` from the latest **published** release of `Shutcord/Shutcord` (the title must end with a build hash, e.g. `DevBuild abc1234`). The repo must be public. Install location: `%APPDATA%\Shutcord\dist`.

A Discord patched by Vencord shows as "Vencord installed" and gets replaced. Uninstalling Shutcord restores the original Discord, not Vencord.
