# Shutcord API server

One small Node program (no packages to install, Node 20 or newer) that does:

- **A dashboard** at `https://your-api/admin`: log in with Discord, add sponsors, pick a tier, upload badge images. The **owner** (you, set by Discord ID) can also add and remove **admins** there. No PowerShell and no shared password.
- **Profile colour, accent and banner** that only Shutcord users see. People log in with Discord at `https://your-api/me`.
- Serves `sponsors.json`, badge images and `/profiles?ids=...` to the client.

Everything is stored as plain files in `server/data/` (`sponsors.json`, `profiles.json`, `admins.json`, `users.json`, `badges/`). Back that folder up.

## Run it

```
cd server
set OWNER_ID=670798169088589827
set DISCORD_CLIENT_ID=...
set DISCORD_CLIENT_SECRET=...
set PUBLIC_URL=https://api.example.com
node server.mjs
```
(On Linux/macOS use `export` instead of `set`.) Open `PUBLIC_URL/admin` and press "Log in with Discord". The account whose ID is `OWNER_ID` becomes the owner.

## Automatic roles when someone sponsors

When a sponsorship starts, changes or ends on GitHub, the server adds the person to your Discord server, gives the role for their tier, and updates `sponsors.json` (tier and badge limit) by itself. Cancelled sponsors lose the role and the tier (their custom badges stay).

Setup, once:
1. **Discord server:** create roles Supporter, Patron, Champion, Legend. Copy each role ID (Developer Mode, right click the role).
2. **Bot:** in your Discord application, open the **Bot** tab, create the bot, copy its token. Open OAuth2 > URL Generator, tick `bot`, give it **Manage Roles** and **Create Instant Invite**, open the generated link and add it to your server. In the server's role list, drag the bot's role **above** the four tier roles.
3. **Server settings:** set `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` (right click the server icon, Copy Server ID) and `GITHUB_WEBHOOK_SECRET` (any long random text), then restart. Open the dashboard and paste the four role IDs under "Discord roles and GitHub Sponsors", then Save.
4. **GitHub:** in your Sponsors dashboard open Webhooks (or the repo/org Settings > Webhooks), add `PUBLIC_URL/webhooks/github`, content type `application/json`, the same secret, and tick **Sponsorships**.
5. **Tell sponsors to link:** put `PUBLIC_URL/link` in your Sponsors welcome message ("Open this link to get your role"). They log in with Discord, which has to have their **GitHub linked in Discord Settings > Connections**. That connection is how the server knows a payment belongs to that Discord user.

What happens: payment first or link first both work. If someone pays before linking, they get their role as soon as they open the link. The dashboard shows the last 30 events so you can see what happened and why something didn't.

Tier by price: a payment gets the most expensive tier whose price is at or below what they paid ($7 gets Patron).

Limits: GitHub sends no event when a **one-time** sponsorship runs out, so those never expire by themselves (remove them in the dashboard). If the join fails because the login expired, the person opens the link again. This was tested with a fake Discord and fake GitHub calls, not the real ones.

## No webhook? Let the server check GitHub (works for personal accounts)

GitHub only sends sponsorship webhooks for some accounts (a repository webhook has no Sponsorships event). Instead the server can ask GitHub for your active sponsors every few minutes and apply the same changes (new, upgrade, downgrade, cancel).

1. Create a token: GitHub, Settings, Developer settings, Personal access tokens, **Tokens (classic)**, Generate new token. Tick **read:user** (and **read:org** if the sponsor page belongs to an organization). Copy it.
2. Add to your `.env`:
   ```
   GITHUB_TOKEN=ghp_...
   GITHUB_SPONSORED_ACCOUNT=shutted
   SPONSOR_POLL_MINUTES=10
   ```
   `GITHUB_SPONSORED_ACCOUNT` is the user or organization that has the Sponsors page.
3. Restart. The dashboard card shows "GitHub check: on", when it last ran and whether it worked, and has a **Check now** button.
4. Sponsors still open `PUBLIC_URL/link` once so the server knows their Discord account.

Roles arrive within a few minutes of a payment. It was tested against a fake GitHub, not the real API, so confirm it with a real $1 sponsor. If "Last run" says FAILED the message says why (for example Bad credentials, or a missing scope).

## Searching, editing and removing badges

- **Find a person:** the search box at the top of the dashboard takes a Discord username or a user ID. It finds people who have logged in to the dashboard or `/link`, and, if the bot is set up, members of your Discord server (this needs **Server Members Intent** switched on in the Discord developer portal under Bot, Privileged Gateway Intents). A pasted ID always works, and the bot fills in the name. Typing also filters the sponsor and custom badge lists below. "Use for sponsor" and "Use for custom badge" copy the ID into the forms.
- **Edit a badge:** every badge row has its tooltip, a file picker to replace the image, **Save**, and **Remove**. Replacing deletes the old image file.
- Names show next to IDs once the server has seen them.

## Custom badges

The dashboard has a **Custom badges** card for badges that aren't tied to a sponsor tier, for example Staff, Tester or a friend. Enter the person's Discord ID, a tooltip and an image, and press Add badge. A person can have up to 10. They show on the profile like sponsor badges (without the Donor popup) and are removed with the remove button next to them.
They are stored in the `custom` section of `sponsors.json`.

## Owner and admins

| | Owner | Admin |
|---|---|---|
| Add/remove sponsors and badges | yes | yes |
| Add/remove admins | yes | no |
| Can be removed | no (set by `OWNER_ID`) | yes, by the owner |

To make someone an admin: they log in to the dashboard once (so their name shows up), then you paste their Discord user ID under "Admins". Anyone else who logs in gets "you are not an admin".

Instead of setting variables by hand you can copy `.env.example` to `.env` (next to `server.mjs`), fill it in, and just run `node server.mjs`. Variables you set in the terminal win over the file.

| Variable | Needed | What |
|---|---|---|
| `OWNER_ID` | yes | Your Discord user ID. This account is the owner of the dashboard |
| `PUBLIC_URL` | yes for real use | The address people reach it at, no trailing slash. Used for badge links and login |
| `PORT` | no | Default 8787 |
| `DATA_DIR` | no | Where files are kept, default `server/data` |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | yes, for any login | From your Discord application (below). Without them nobody can log in |
| `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` | for auto roles | Bot token and your server's ID (see "Automatic roles") |
| `GITHUB_WEBHOOK_SECRET` | for auto roles | A long random string you also paste into GitHub |
| `PROFILES_SPONSORS_ONLY` | no | Set to `1` so only sponsors can style their profile |

## Make it reachable from the internet

Pick one:
1. **A VPS** (any cheap Linux box): run it with `pm2` or systemd, put Caddy or nginx in front for HTTPS.
2. **Your own PC + Cloudflare Tunnel** (free): install `cloudflared`, run `cloudflared tunnel --url http://localhost:8787`, and use the https address it prints as `PUBLIC_URL`. A named tunnel gives a fixed address. The PC must stay on.

It must be **https**, because Discord blocks plain http.

## Discord login (dashboard and profiles)

1. https://discord.com/developers/applications, New Application, name it Shutcord.
2. OAuth2 tab: copy the Client ID and Client Secret into the variables above.
3. Add the redirect `PUBLIC_URL/callback` (exactly, for example `https://api.example.com/callback`).
It only asks for "identify" (who you are). It can't read messages or servers.

## Connect the client

In `src/shared/api.ts` set `SHUTCORD_API = "https://api.example.com"`, then push (the workflow rebuilds the client). From then on the client reads `sponsors.json` and badge images from your server instead of GitHub.

## Safety notes

- Admin routes need a Discord login that is the owner or an admin; everyone else gets 401/403. Changes also need a custom header, so another website can't trigger them from your browser.
- Badge uploads are checked: real png/jpg/gif/webp only, 512 KB max, limited by tier (a Patron can't get 2 badges).
- Login cookies are signed and `HttpOnly`. Requests are rate limited per address.
- The profile colours and banner are stored and served. **The client part that draws them on profiles is not written yet.**
