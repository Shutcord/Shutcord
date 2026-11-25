# Sponsors and perks

Shutcord has no payment code. Money goes through **GitHub Sponsors** (or Ko-fi, etc.); perks are handed out by hand with one file, `sponsors.json`.

## The tiers

| Tier | Price | Perks |
|---|---|---|
| Supporter | $1 / month | Your GitHub avatar in the README, Donor role in the Shutcord Discord server, "Thank you" card in settings. No badge. |
| Patron | $5 / month | All of the above + 1 custom profile badge + a custom role (name, colour, icon) |
| Champion | $10 / month | All of the above + up to 2 profile badges |
| Legend | $25 / month | All of the above + up to 5 profile badges |

Badges are visible to everyone using Shutcord (not to people without it). Change names, prices and badge counts in `sponsors.json` under `tiers`; the client enforces the badge limit, so editing a sponsor to have too many badges just cuts the extras.

## One-time setup

### 1. GitHub Sponsors
1. Go to https://github.com/sponsors and join the waitlist for your user or the `Shutcord` org (needs a verified bank / Stripe account; approval takes a few days).
2. Create four monthly tiers with the prices above. Paste the perk text from the table into each description.
3. Add a sentence: "To claim perks, message me on Discord (join the server first)."
4. `.github/FUNDING.yml` already contains `github: [Shutcord]`. Change it if the sponsor page is under your personal account. The "Sponsor" button then appears on the repo.
5. The in-app Donate button opens the repo. To open the sponsor page directly, change the URL in `src/components/settings/DonateButton.tsx` to `https://github.com/sponsors/Shutcord`.

### 2. Discord server (for roles)
1. Create a Discord server. In Settings > Roles create **Donor**, **Contributor** (optional) and one role per Patron+ sponsor as needed.
2. Turn on Developer Mode (Discord settings > Advanced). Right-click the server icon > Copy Server ID; right-click each role in the role list > Copy Role ID.
3. Put them into `src/utils/constants.ts`: `SHUTCORD_GUILD_ID`, `DONOR_ROLE_ID` (and `CONTRIB_ROLE_ID`, `SUPPORT_CHANNEL_ID` if you use them). `"0"` means off. Anyone with the Donor role in that server is treated as a donor in-app (the settings page shows "Thank you for donating!").
4. Rebuild (`pnpm build`) and publish a new release.

## Easier: the admin page

If you run the API server (`server/README.md`) you can add sponsors and upload badges in the browser at `/admin` (log in with Discord) instead of using `pnpm sponsors`. A Discord server and roles are not needed for badges.

## Giving perks when someone sponsors

1. They message you on Discord with their GitHub name and Discord user ID (right click their name > Copy User ID).
2. Give them the Donor role (and a custom role for Patron+).
3. Add them (badge image: 64x64 PNG, transparent background):
   ```
   pnpm sponsors add 123456789012345678 patron --github their-github-name --tooltip "Patron" --image ./their-badge.png
   pnpm sponsors validate
   pnpm sponsors readme
   ```
   `add` copies the image to `badges/` and writes the entry. Run `add ... --image` again for more badges (Champion 2, Legend 5). A Supporter has no badge, so use `add <id> supporter --github name`.
4. Commit and push: `git add sponsors.json badges README.md`, `git commit -m "Add sponsor"`, `git push`.
5. Users get the badge within 30 minutes (the client reloads `sponsors.json` every 30 minutes; restart Discord for instant). No rebuild or new release is needed.

When someone stops sponsoring: `pnpm sponsors remove <discordId>`, push, and take their roles.

## Files

| File | What |
|---|---|
| `sponsors.json` | Tiers and sponsors. Fetched from `raw.githubusercontent.com/Shutcord/Shutcord/main/sponsors.json` |
| `badges/` | Badge images (must be on `raw.githubusercontent.com` or `cdn.discordapp.com` or they are ignored) |
| `scripts/sponsors/sponsors.mjs` | The helper behind `pnpm sponsors` |
| `.github/workflows/sponsors.yml` | Checks `sponsors.json` on every push and PR |
| `src/utils/sponsors.ts` | Client logic: tier limits and badge host check |
| `src/plugins/_api/badges/index.tsx` | Loads the file and draws the badges |

The repo must stay public, otherwise the client can't fetch `sponsors.json`.

## Hiding badges

Discord's own badge hiding is saved on Discord's servers, so it can't cover Shutcord badges. Shutcord has two switches in Settings > Shutcord: "Hide my own Shutcord badges" and "Hide everyone's Shutcord sponsor badges". They only change what you see on your own screen.
To remove a badge for everyone, delete it from the sponsor's entry in `sponsors.json` and push.
