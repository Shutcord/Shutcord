# Shutcord setup: links, donations, what to change

Shutcord is a rebrand of Vencord (GPL-3.0). Keep `LICENSE` and the copyright headers in the source files.

## 1. Links to change (all currently placeholders)

| What | Placeholder used | File(s) |
|---|---|---|
| GitHub repo | `github.com/Shutcord/Shutcord` | `package.json` (homepage, bugs, repository), `packages/*/package.json`, `browser/manifest.json`, `browser/manifestv2.json`, `browser/userscript.meta.js` (4 lines), `browser/ShutcordNativeStub.ts:76`, `scripts/runInstaller.mjs:61`, `src/main/utils/extensions.ts:86`, `src/plugins/_core/supportHelper.tsx:87`, `.github/*`, `.github/workflows/build.yml:57` |
| Website / download | `https://shut.wtf/download` | `src/plugins/_core/supportHelper.tsx` (155, 156, 248) |
| Plugin pages | `https://shut.wtf/plugins/<name>`, `/source`, `/cloud/privacy` | `PluginModal.tsx:186`, `ContributorModal.tsx:55`, `CloudTab.tsx:72` (these pages don't exist until you build them, or point them elsewhere) |
| Discord server | `https://shut.wtf/discord` | `.github/ISSUE_TEMPLATE/*`, `README.md`, `CONTRIBUTING.md` (make this a redirect to your invite) |
| Docs | `https://docs.shut.wtf` | `CONTRIBUTING.md:5` |
| Cloud sync API | `https://api.shut.wtf/` | `src/api/Settings.ts:127`, `src/api/SettingsSync/cloudSetup.tsx:23`, CSP in `src/main/csp/index.ts:63` |
| Badges JSON | `https://badges.shut.wtf/badges.json` | `src/plugins/_api/badges/index.tsx:66` |
| Donate link | `https://shut.wtf/donate` | `src/components/settings/DonateButton.tsx:25`, `src/plugins/_api/badges/index.tsx:284` |
| Your Discord server IDs | all `"0"` | `src/utils/constants.ts` |

The in-app updater does not use the placeholder. It uses your repo's real `git remote origin` at build time (override with the `SHUTCORD_REMOTE` env var). Clone your real repo before building and updates will follow it.

### Left as upstream on purpose
- `@vencord/*` npm package names and `packages/vencord-types`. They are dependencies, and renaming them breaks `pnpm install --frozen-lockfile`.
- `scripts/runInstaller.mjs` still downloads `Vencord/Installer` (the `VencordInstallerCli` binary). It only patches Discord to load `dist/patcher.js`, so it works for Shutcord. The `VENCORD_USER_DATA_DIR` and `VENCORD_DEV_INSTALL` env vars are kept because that binary reads them. `SHUTCORD_USER_DATA_DIR` also works.
- `Vencord/ShikiPluginAssets`, `Vencord/plugin-assets`, the `Vendicated/Vencord/assets/...` screenshot links in plugin READMEs, and ReviewDB (`manti.vendicated.dev`). These are third-party-hosted assets and services, and rewriting them would 404.
- The copyright lines ("Vendicated and contributors") in every source header, plus `LICENSE`. The GPL requires them.

### Image assets you should replace
- `browser/icon.png` (the extension icon).
- Donation card images in `src/components/settings/tabs/shutcord/index.tsx:47-52` (Discord CDN emoji/stickers from the Vencord server). Swap in your own URLs, and add the host to the CSP list in `src/main/csp/index.ts` if it isn't `cdn.discordapp.com`.
- The contributor badge icon (`src/plugins/_api/badges/index.tsx:~43`).

## 2. Donation system: how it works

There is no payment processing in the client. It is only a link plus a badge and role check.

1. **Donate button.** The Shutcord settings page has a "Support the Project" card, and the button just opens a URL. Set it in the two files above to your Ko-fi, GitHub Sponsors, Stripe Payment Link, Patreon or whatever you use.
2. **Who counts as a donor.** `isDonor()` in `src/components/settings/tabs/shutcord/DonateButton.tsx` is true if either:
   - the user's ID is in `badges.json` (below), or
   - the user has the role `DONOR_ROLE_ID` in your server `SHUTCORD_GUILD_ID` (`src/utils/constants.ts`). This only works if the user is in that server.

   Donors see a "Thank you for donating!" card instead of the donate card.
3. **Donor badge.** On startup, and every 30 minutes, the client fetches `https://badges.shut.wtf/badges.json`. Clicking a donor badge opens a thank-you modal.

   Format, keyed by Discord user ID:
   ```json
   {
     "123456789012345678": [
       { "tooltip": "Shutcord Donor", "badge": "https://badges.shut.wtf/img/donor.png" }
     ]
   }
   ```
   Add `"2": 1` to an entry if you also host an `@2x` version of the image, for example `donor@2x.png`.

### Setting it up yourself
1. Choose a payment platform and put its link in the two donate spots.
2. Host a static `badges.json` at `badges.shut.wtf` (Cloudflare Pages, GitHub Pages, any static host). Send CORS header `Access-Control-Allow-Origin: *`.
3. When someone donates, add their Discord ID to `badges.json`. This is manual, or you can script it from your payment platform's webhook.
4. Optionally, create a Donor role in your Discord server, put the real IDs in `src/utils/constants.ts`, and give the role to donors.
5. If `badges.shut.wtf` is down or doesn't exist yet, I made badge loading fail quietly (`try/catch` in `loadBadges`), so the client still works. Donor badges just won't show.

## 3. Cloud sync (optional feature)
It is off by default. To use it you must run a backend at `api.shut.wtf`. The upstream backend is AGPL-3.0 at https://github.com/Vencord/Backend. If you don't host one, tell users to ignore the Cloud tab, or hide it.

## 4. Build and install
```sh
pnpm install --frozen-lockfile
pnpm build
pnpm inject      # asks which Discord to patch
```
Settings are stored in a `Shutcord` folder (next to Discord's data dir), separate from any existing Vencord settings.

## 5. Installer (ShutcordInstaller)
- `installer/ShutcordInstallerCli.exe` (Windows) and `installer/ShutcordInstallerCli-linux` are prebuilt. `pnpm inject` / `pnpm uninject` use them automatically, with no download.
- Go source is in `installer/source`. It is a rebrand of Vencord/Installer (GPL-3.0). Build it with:
  - CLI: `make PLATFORM=windows ARCH=amd64` (needs Go).
  - GUI (Windows only): `make PLATFORM=windows GUI=1` (needs MSYS2/mingw and go-winres, see the Makefile).
- Things to change in `installer/source/constants.go` and `self_updater.go`:
  - `ReleaseUrl` and `ReleaseUrlFallback`: where the installer downloads Shutcord's `patcher.js`, `preload.js`, `renderer.js` and `renderer.css`. Currently the latest GitHub release of `Shutcord/Shutcord`. The release title must end with the build hash, e.g. "DevBuild abc1234". `.github/workflows/build.yml` does this.
  - `InstallerReleaseUrl` and the self-updater `BaseUrl`: where the installer updates itself. Currently `Shutcord/ShutcordInstaller` releases. Upload the installer binaries there.
- Standalone installs (without the repo) go to `%APPDATA%\Shutcord\dist`.
- If Discord shows "Cannot find module ...\dist\patcher.js", run `pnpm build` and then `pnpm inject` again.
