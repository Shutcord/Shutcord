# How to edit Shutcord's settings screen

The picture `settings-annotated.png` shows the Shutcord settings page. Each pink number is a part of the page. This table tells you which file to open to change it. All paths start at the project folder.

| # | What you see | File to edit | What to change |
|---|---|---|---|
| 1 | Banner background (purple art) | `src/components/settings/tabs/shutcord/art.ts` | The colors in `SHUTCORD_COLORS`, or the `banner(...)` function, which draws the slats. `BANNER_DONATE`, `BANNER_DONOR` and `BANNER_CONTRIB` are the three banners |
| 1 | Banner shape, border, glow, text colors | `src/components/settings/SpecialCard.css` | `.vc-special-card-special` (border, radius, shadow), `.vc-special-title`, `.vc-special-text` (colors) |
| 2 | "Support the Project" and the sentence below it | `src/components/settings/tabs/shutcord/index.tsx` around line 157 | `title="..."` and `description="..."` |
| 3 | The Donate button | `src/components/settings/DonateButton.tsx` line 25 | The link inside `openExternal("...")`, and the word `Donate` below it. The same link is also in `src/plugins/_api/badges/index.tsx` line 284 |
| 4 | Round logo badge | `art.ts` (`LOGO_IMAGE`) and `SpecialCard.css` (`.vc-special-image-container`) | Replace the SVG, or change size, corner radius and glow in the CSS |
| 5 | "Quick Actions" row | `src/components/settings/tabs/shutcord/index.tsx` lines 182-215 | The `text="..."` of each `QuickAction`, or remove one entirely. Pill style: `src/components/settings/QuickAction.css` |
| 6 | The switches (Enable Custom CSS and so on) | `index.tsx` function `Switches()` at the top, around line 59 | `title` and `description` of each switch |
| - | Sidebar entries ("Shutcord", "Plugins", "Themes"...) and the "Shutcord Settings" header | `src/plugins/_core/settings.tsx` lines 155-235 | `title:` and `panelTitle:` |
| - | The accent color of switches and buttons in Shutcord's own tabs | `src/components/settings/tabs/styles.css` (bottom of the file) | `--brand-500`, `--control-brand-foreground` and friends |
| - | Window title of the QuickCSS editor | `src/main/ipcMain.ts` line 149 | `const title = "..."` |

## The edit, build, test loop

1. Open the file in any editor (VS Code is good), change the text or the color, save.
2. In a terminal inside the project folder, run `pnpm build`.
3. In Discord, press **Ctrl+R** to reload. Your change is there.
   If Discord is not running from this folder (you installed with the public installer), the build must be uploaded to your `devbuild` release first and you reinstall with the installer.
4. For quick experiments, run `pnpm build --watch`. It rebuilds each time you save, and you only press Ctrl+R.

If Discord shows a blank settings page after an edit, you broke a file. Undo your last change, run `pnpm build`, and press Ctrl+R again. `git diff` shows exactly what you changed.

## Changing the images

Nothing in the settings page loads images from the internet any more. The logo and the banners are SVG text inside `art.ts`. To use your own logo:
1. Export it as an SVG.
2. Replace the SVG between the backticks in `LOGO_IMAGE`.
3. For the PNG icons (browser extension, installer), replace the files in `assets/` and copy `assets/icon-128.png` over `browser/icon.png`.

## What is not renamed on purpose

The CSS class names start with `vc-` (for example `vc-special-card`). Themes made by the community target these names, so changing them would break themes. Nobody sees them on screen.
