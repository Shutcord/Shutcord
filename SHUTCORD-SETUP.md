# Shutcord setup

Shutcord is a rebrand of Vencord (GPL-3.0). Keep `LICENSE` and the copyright headers in the source files.
Editing the settings screen: `docs/EDITING-THE-UI.md`. Logos: `assets/`.

## Links: everything points to GitHub
The only website is the GitHub repo, `https://github.com/Shutcord/Shutcord`. If you rename the org or repo, search the project for `Shutcord/Shutcord` and replace it. The main places:

| What | File |
|---|---|
| Donate button | `src/components/settings/DonateButton.tsx:25` and `src/plugins/_api/badges/index.tsx:284` |
| "Official builds" links (support helper) | `src/plugins/_core/supportHelper.tsx` |
| Issue templates | `.github/ISSUE_TEMPLATE/*` |
| Installer download URLs | `installer/source/constants.go` |
| Installer UI links | `installer/source/web/index.html` |
| Package metadata | `package.json`, `browser/manifest*.json`, `browser/userscript.meta.js` |

The in-app updater uses your real `git remote origin` at build time.

## Donations
There is no payment code in the client, only a link plus badges.
1. The Donate button opens `https://github.com/Shutcord/Shutcord`. When you have GitHub Sponsors, Ko-fi or another page, change that link in the two files above.
2. Donor badges come from `badges.json` in the root of the repo (`https://raw.githubusercontent.com/Shutcord/Shutcord/main/badges.json`). It is empty (`{}`) now. To give someone a badge, add their Discord ID:
   ```json
   {
     "123456789012345678": [
       { "tooltip": "Shutcord Donor", "badge": "https://raw.githubusercontent.com/Shutcord/Shutcord/main/assets/icon-64.png" }
     ]
   }
   ```
3. A user also counts as a donor if they have `DONOR_ROLE_ID` in `SHUTCORD_GUILD_ID` (`src/utils/constants.ts`). Both are `"0"` (off) until you have a Discord server.
4. If the file can't be loaded, badges are skipped quietly.

## Cloud sync
Off by default and unavailable: its address is a placeholder (`cloud.shutcord.invalid`, in `src/api/Settings.ts`). To use it you must host a backend (the open-source one is at https://github.com/Vencord/Backend) and put its address there.

## Installer
Prebuilt in `installer/`:
- `ShutcordInstaller.exe`: the installer window.
- `ShutcordInstallerCli.exe`: command line, used by `pnpm inject` and `pnpm uninject`.

Source: `installer/source` (UI: `web/index.html`, window: `window_windows.go`). Build commands are in `installer/source/README.md`.

It downloads `patcher.js`, `preload.js`, `renderer.js`, `renderer.css` from the latest **published** release of `Shutcord/Shutcord` (the title must end with a build hash, e.g. `DevBuild abc1234`). The repo must be public. Install location: `%APPDATA%\Shutcord\dist`.

A Discord patched by Vencord shows as "Vencord installed" and gets replaced. Uninstalling Shutcord restores the original Discord, not Vencord.
