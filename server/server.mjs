#!/usr/bin/node
/*
 * Shutcord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Shutcord API: sponsors + badges + profile colours/banners. No dependencies, Node 20+.
//   OWNER_ID=<your discord id> DISCORD_CLIENT_ID=... DISCORD_CLIENT_SECRET=... PUBLIC_URL=https://api.example.com node server/server.mjs
// See server/README.md.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Reads KEY=VALUE lines from a .env file (ENV_FILE, server/.env or the folder above). Real environment variables win.
for (const f of [process.env.ENV_FILE, join(here, ".env"), join(here, "..", ".env")].filter(Boolean)) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (!m || line.trim().startsWith("#")) continue;
        process.env[m[1]] ??= m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
    console.log("Loaded settings from " + f);
    break;
}
const env = process.env;
const PORT = Number(env.PORT || 8787);
const DATA = env.DATA_DIR || join(here, "data");
const PUBLIC_URL = (env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const OWNER_ID = env.OWNER_ID || "";
const CLIENT_ID = env.DISCORD_CLIENT_ID || "";
const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET || "";
const SPONSORS_ONLY = env.PROFILES_SPONSORS_ONLY === "1";
const BOT_TOKEN = env.DISCORD_BOT_TOKEN || "";
const GUILD_ID = env.DISCORD_GUILD_ID || "";
const WEBHOOK_SECRET = env.GITHUB_WEBHOOK_SECRET || "";
const GITHUB_TOKEN = env.GITHUB_TOKEN || "";
const GITHUB_ACCOUNT = env.GITHUB_SPONSORED_ACCOUNT || "";
const GITHUB_GRAPHQL = env.GITHUB_GRAPHQL || "https://api.github.com/graphql";
const POLL_MINUTES = Math.max(1, Number(env.SPONSOR_POLL_MINUTES || 10));
const DISCORD_API = (env.DISCORD_API || "https://discord.com/api").replace(/\/$/, "");

if (!/^\d{15,22}$/.test(OWNER_ID)) {
    console.error("Set OWNER_ID to your Discord user ID (Developer Mode, right click yourself, Copy User ID).");
    process.exit(1);
}
if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET)
    console.warn("DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET are not set: nobody can log in to the dashboard until you set them.");

mkdirSync(join(DATA, "badges"), { recursive: true });
const F = { sponsors: join(DATA, "sponsors.json"), profiles: join(DATA, "profiles.json"), admins: join(DATA, "admins.json"), integ: join(DATA, "integration.json"), links: join(DATA, "links.json"), spons: join(DATA, "sponsorships.json"), events: join(DATA, "events.json"), users: join(DATA, "users.json"), secret: join(DATA, "secret") };
if (!existsSync(F.sponsors)) {
    const seed = join(here, "..", "sponsors.json");
    writeFileSync(F.sponsors, existsSync(seed) ? readFileSync(seed) : JSON.stringify({ tiers: {}, sponsors: {} }));
}
if (!existsSync(F.profiles)) writeFileSync(F.profiles, "{}");
if (!existsSync(F.admins)) writeFileSync(F.admins, "[]");
if (!existsSync(F.users)) writeFileSync(F.users, "{}");
for (const [k, v] of [["integ", "{\"tierRoles\":{}}"], ["links", "{}"], ["spons", "{}"], ["events", "[]"]]) if (!existsSync(F[k])) writeFileSync(F[k], v);
if (!existsSync(F.secret)) writeFileSync(F.secret, randomBytes(32).toString("hex"));
const SECRET = readFileSync(F.secret, "utf8").trim();

const readJson = f => JSON.parse(readFileSync(f, "utf8"));
const writeJson = (f, d) => { writeFileSync(f + ".tmp", JSON.stringify(d, null, 2)); renameSync(f + ".tmp", f); };

// ---------- helpers ----------
const ID = /^\d{15,22}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const sign = s => createHmac("sha256", SECRET).update(s).digest("hex");
const safeEq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const makeSession = id => { const exp = Date.now() + 30 * 864e5; return `${id}.${exp}.${sign(id + "." + exp)}`; };
function readSession(req) {
    const m = /(?:^|;\s*)sc_session=([^;]+)/.exec(req.headers.cookie || "");
    const [id, exp, sig] = (m?.[1] || "").split(".");
    if (!id || !exp || !sig || !ID.test(id) || Number(exp) < Date.now() || !safeEq(sig, sign(id + "." + exp))) return null;
    return id;
}

const hits = new Map();
function limited(req, max = 60) {
    const k = req.socket.remoteAddress + (req.headers["cf-connecting-ip"] || "");
    const now = Date.now(), h = (hits.get(k) ?? []).filter(t => now - t < 60000);
    h.push(now); hits.set(k, h);
    return h.length > max;
}

function sponsorProblems(d) {
    for (const [id, s] of Object.entries(d.sponsors)) {
        if (!ID.test(id)) return `${id}: not a Discord ID`;
        const tier = d.tiers[s.tier];
        if (!tier) return `${id}: unknown tier ${s.tier}`;
        if ((s.badges ?? []).length > tier.badges) return `${tier.name} allows only ${tier.badges} badge(s)`;
    }
}

const IMG_TYPES = [
    ["image/png", [0x89, 0x50, 0x4e, 0x47], "png"],
    ["image/jpeg", [0xff, 0xd8, 0xff], "jpg"],
    ["image/gif", [0x47, 0x49, 0x46, 0x38], "gif"],
];
function sniff(buf) {
    for (const [mime, magic, ext] of IMG_TYPES) if (magic.every((b, i) => buf[i] === b)) return { mime, ext };
    if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
    return null;
}

function body(req, limit = 2_000_000) {
    return new Promise((res, rej) => {
        const chunks = []; let n = 0;
        req.on("data", c => { n += c.length; if (n > limit) { rej(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
        req.on("end", () => { try { res(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); } catch { rej(Object.assign(new Error("bad json"), { status: 400 })); } });
    });
}

const state_next = req => /(?:^|;\s*)sc_next=admin/.test(req.headers.cookie || "") ? "/admin" : "/me";
const send = (res, code, data, headers = {}) => {
    const isStr = typeof data === "string" || Buffer.isBuffer(data);
    res.writeHead(code, { "access-control-allow-origin": "*", "x-content-type-options": "nosniff", ...(isStr ? {} : { "content-type": "application/json" }), ...headers });
    res.end(isStr ? data : JSON.stringify(data));
};
const html = (res, page) => send(res, 200, page, { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' https: data:" });

const roleOf = id => id === OWNER_ID ? "owner" : readJson(F.admins).includes(id) ? "admin" : null;
const userName = id => readJson(F.users)[id]?.name;

// ---------- GitHub Sponsors -> Discord ----------
const botReady = () => !!(BOT_TOKEN && GUILD_ID);
const lc = s => String(s || "").toLowerCase();

function logEvent(text) {
    const ev = readJson(F.events);
    ev.unshift({ at: new Date().toISOString(), text });
    writeJson(F.events, ev.slice(0, 100));
}

async function discordBot(method, path, json) {
    const r = await fetch(DISCORD_API + path, { method, headers: { authorization: "Bot " + BOT_TOKEN, "content-type": "application/json" }, body: json ? JSON.stringify(json) : undefined });
    return r.status;
}

function tierForPrice(d, usd) {
    let best = null;
    for (const [k, tier] of Object.entries(d.tiers)) if (tier.usd <= usd && (!best || tier.usd > d.tiers[best].usd)) best = k;
    return best;
}

/** Sets the sponsor entry in sponsors.json and the Discord roles to match `tierKey` (null = not a sponsor any more) */
async function applyTier(discordId, github, tierKey, accessToken) {
    const d = readJson(F.sponsors);
    if (tierKey && d.tiers[tierKey]) {
        const s = d.sponsors[discordId] ??= { tier: tierKey };
        s.tier = tierKey; s.github = github;
        const limit = d.tiers[tierKey].badges;
        for (const gone of (s.badges ?? []).splice(limit)) {
            const f = join(DATA, "badges", gone.badge.split("/").pop());
            if (gone.badge.startsWith(PUBLIC_URL) && existsSync(f)) unlinkSync(f);
        }
    } else delete d.sponsors[discordId];
    writeJson(F.sponsors, d);

    if (!botReady()) return;
    const roles = readJson(F.integ).tierRoles;
    const want = tierKey && roles[tierKey];
    if (want && accessToken) {
        const st = await discordBot("PUT", `/guilds/${GUILD_ID}/members/${discordId}`, { access_token: accessToken, roles: [want] });
        if (st >= 300) logEvent(`Could not add ${discordId} to the server (HTTP ${st}). Is the bot in the server with Create Invite / Manage Roles?`);
    }
    for (const [k, id] of Object.entries(roles)) {
        if (!id) continue;
        const st = await discordBot(k === tierKey ? "PUT" : "DELETE", `/guilds/${GUILD_ID}/members/${discordId}/roles/${id}`);
        if (k === tierKey && st >= 300) logEvent(`Could not give role ${k} to ${discordId} (HTTP ${st}). Is the bot's role above the tier roles?`);
    }
}

async function reconcile(login, accessToken) {
    const sp = readJson(F.spons)[login];
    const link = readJson(F.links)[login];
    if (!link) return "waiting";
    const tier = sp?.active ? sp.tier : null;
    await applyTier(link.id, login, tier, accessToken);
    logEvent(`${login} (${link.id}): ${tier ? "now " + tier : "no active sponsorship, perks removed"}`);
    return tier ? "active" : "none";
}

async function onSponsorship(payload) {
    const login = lc(payload.sponsorship?.sponsor?.login);
    if (!login) return;
    const price = Number(payload.sponsorship?.tier?.monthly_price_in_dollars ?? 0);
    const all = readJson(F.spons);
    const d = readJson(F.sponsors);
    const action = payload.action;
    const cur = all[login] ?? {};
    if (action === "cancelled") all[login] = { ...cur, active: false };
    else if (["created", "edited", "tier_changed"].includes(action)) all[login] = { usd: price, tier: tierForPrice(d, price), active: true, oneTime: !!payload.sponsorship?.tier?.is_one_time };
    else { logEvent(`${login}: ${action} (nothing to do until it takes effect)`); return; }
    writeJson(F.spons, all);
    logEvent(`GitHub: ${login} ${action}${all[login].active ? ` ($${price} -> ${all[login].tier ?? "no matching tier"})` : ""}`);
    const r = await reconcile(login);
    if (r === "waiting") logEvent(`${login} has not linked Discord yet. Send them ${PUBLIC_URL}/link`);
}

// Asks GitHub for the current sponsors of GITHUB_SPONSORED_ACCOUNT and applies the differences
const poll = { last: null, ok: null, message: "never run", running: false };
const pollConfigured = () => !!(GITHUB_TOKEN && GITHUB_ACCOUNT);

async function fetchActiveSponsors() {
    const query = `query($owner:String!,$after:String){repositoryOwner(login:$owner){... on Sponsorable{sponsorshipsAsMaintainer(first:100,after:$after,activeOnly:true,includePrivate:true){pageInfo{hasNextPage endCursor}nodes{isOneTimePayment tier{monthlyPriceInDollars}sponsorEntity{... on User{login} ... on Organization{login}}}}}}}`;
    const out = {};
    let after = null;
    for (let i = 0; i < 20; i++) {
        const r = await fetch(GITHUB_GRAPHQL, { method: "POST", headers: { authorization: "Bearer " + GITHUB_TOKEN, "content-type": "application/json", "user-agent": "shutcord-server" }, body: JSON.stringify({ query, variables: { owner: GITHUB_ACCOUNT, after } }) });
        const j = await r.json();
        if (!r.ok || j.errors) throw new Error(j.message || j.errors?.[0]?.message || "HTTP " + r.status);
        const conn = j.data?.repositoryOwner?.sponsorshipsAsMaintainer;
        if (!conn) throw new Error(`GitHub account "${GITHUB_ACCOUNT}" not found or has no sponsors listing`);
        for (const n of conn.nodes) {
            const login = lc(n.sponsorEntity?.login);
            if (login) out[login] = { usd: Number(n.tier?.monthlyPriceInDollars ?? 0), oneTime: !!n.isOneTimePayment };
        }
        if (!conn.pageInfo.hasNextPage) break;
        after = conn.pageInfo.endCursor;
    }
    return out;
}

async function pollGithub() {
    if (!pollConfigured() || poll.running) return;
    poll.running = true;
    try {
        const active = await fetchActiveSponsors();
        const known = readJson(F.spons);
        const d = readJson(F.sponsors);
        let changes = 0;
        for (const [login, s] of Object.entries(active)) {
            const tier = tierForPrice(d, s.usd);
            const cur = known[login];
            if (cur?.active && cur.tier === tier && cur.usd === s.usd) continue;
            await onSponsorship({ action: cur?.active ? "tier_changed" : "created", sponsorship: { sponsor: { login }, tier: { monthly_price_in_dollars: s.usd, is_one_time: s.oneTime } } });
            changes++;
        }
        for (const [login, cur] of Object.entries(known)) {
            if (!cur.active || active[login]) continue;
            await onSponsorship({ action: "cancelled", sponsorship: { sponsor: { login }, tier: { monthly_price_in_dollars: 0 } } });
            changes++;
        }
        poll.ok = true; poll.message = `${Object.keys(active).length} active sponsor(s), ${changes} change(s)`;
    } catch (e) {
        poll.ok = false; poll.message = String(e.message || e).slice(0, 200);
        logEvent("GitHub check failed: " + poll.message);
    } finally {
        poll.last = new Date().toISOString(); poll.running = false;
    }
}

const page = (res, title, bodyHtml) => html(res, `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${title}</title>${STYLE}<main><h1>${title}</h1><div class=card>${bodyHtml}</div></main>`);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function rawBody(req, limit = 1_000_000) {
    return new Promise((res, rej) => {
        const chunks = []; let n = 0;
        req.on("data", c => { n += c.length; if (n > limit) { rej(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
        req.on("end", () => res(Buffer.concat(chunks)));
    });
}

// ---------- routes ----------
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, PUBLIC_URL);
        const path = url.pathname;
        if (req.method === "OPTIONS") return send(res, 204, "", { "access-control-allow-methods": "GET,POST,PUT,DELETE", "access-control-allow-headers": "authorization,content-type" });
        if (limited(req, req.method === "GET" ? 240 : 40)) return send(res, 429, { error: "slow down" });

        // public
        if (path === "/sponsors.json") return send(res, 200, readFileSync(F.sponsors), { "content-type": "application/json", "cache-control": "public, max-age=60" });
        if (path === "/profiles") {
            const ids = (url.searchParams.get("ids") || "").split(",").filter(i => ID.test(i)).slice(0, 100);
            const all = readJson(F.profiles), out = {};
            for (const i of ids) if (all[i]) out[i] = all[i];
            return send(res, 200, out, { "cache-control": "public, max-age=60" });
        }
        const bm = /^\/badges\/([\w.@-]+)$/.exec(path);
        if (bm && req.method === "GET") {
            const f = join(DATA, "badges", bm[1]);
            if (!existsSync(f)) return send(res, 404, { error: "not found" });
            const buf = readFileSync(f);
            return send(res, 200, buf, { "content-type": sniff(buf)?.mime ?? "application/octet-stream", "cache-control": "public, max-age=3600" });
        }
        if (path === "/health") return send(res, 200, { ok: true });

        // admin
        if (path === "/admin") return html(res, ADMIN_PAGE);
        if (path.startsWith("/admin/api/")) {
            const uid = readSession(req);
            if (!uid) return send(res, 401, { error: "not logged in" });
            const role = roleOf(uid);
            if (path === "/admin/api/me") return send(res, 200, { id: uid, name: userName(uid) ?? null, role });
            if (!role) return send(res, 403, { error: "you are not an admin" });
            if (req.method !== "GET" && req.headers["x-requested-with"] !== "shutcord") return send(res, 403, { error: "missing header" });
            const d = readJson(F.sponsors);

            if (path === "/admin/api/integration/poll" && req.method === "POST") {
                if (role !== "owner") return send(res, 403, { error: "only the owner changes this" });
                if (!pollConfigured()) return send(res, 400, { error: "Set GITHUB_TOKEN and GITHUB_SPONSORED_ACCOUNT first" });
                await pollGithub();
                return send(res, 200, { ...poll });
            }

            if (path === "/admin/api/integration") {
                if (role !== "owner") return send(res, 403, { error: "only the owner changes this" });
                const cfg = readJson(F.integ);
                const view = () => ({ botConfigured: botReady(), webhookConfigured: !!WEBHOOK_SECRET, poll: { configured: pollConfigured(), account: GITHUB_ACCOUNT, every: POLL_MINUTES, ...poll }, webhookUrl: PUBLIC_URL + "/webhooks/github", linkUrl: PUBLIC_URL + "/link", tierRoles: cfg.tierRoles, events: readJson(F.events).slice(0, 30) });
                if (req.method === "GET") return send(res, 200, view());
                if (req.method === "POST") {
                    const b = await body(req, 5000);
                    for (const [k, v] of Object.entries(b.tierRoles ?? {})) {
                        if (!d.tiers[k]) continue;
                        if (v && !ID.test(String(v))) return send(res, 400, { error: `Role ID for ${k} must be 15-22 digits` });
                        cfg.tierRoles[k] = v || "";
                    }
                    writeJson(F.integ, cfg);
                    return send(res, 200, view());
                }
            }

            if (path === "/admin/api/admins") {
                if (role !== "owner") return send(res, 403, { error: "only the owner manages admins" });
                const admins = readJson(F.admins);
                const view = () => ({ owner: { id: OWNER_ID, name: userName(OWNER_ID) ?? null }, admins: admins.map(id => ({ id, name: userName(id) ?? null })) });
                if (req.method === "GET") return send(res, 200, view());
                if (req.method === "POST") {
                    const b = await body(req, 2000);
                    if (!ID.test(b.id || "")) return send(res, 400, { error: "Discord ID must be 15-22 digits" });
                    if (b.id === OWNER_ID) return send(res, 400, { error: "that's you, the owner" });
                    if (!admins.includes(b.id)) { admins.push(b.id); writeJson(F.admins, admins); }
                    return send(res, 200, view());
                }
                if (req.method === "DELETE") {
                    const b = await body(req, 2000);
                    writeJson(F.admins, admins.filter(i => i !== b.id));
                    return send(res, 200, { ...view(), admins: admins.filter(i => i !== b.id).map(id => ({ id, name: userName(id) ?? null })) });
                }
            }

            if (path === "/admin/api/data" && req.method === "GET") return send(res, 200, d);

            if (path === "/admin/api/sponsor" && req.method === "POST") {
                const b = await body(req);
                if (!ID.test(b.id || "")) return send(res, 400, { error: "Discord ID must be 15-22 digits" });
                if (!d.tiers[b.tier]) return send(res, 400, { error: "unknown tier" });
                const s = d.sponsors[b.id] ??= { tier: b.tier };
                s.tier = b.tier;
                if (typeof b.github === "string") s.github = b.github.replace(/[^\w-]/g, "").slice(0, 39) || undefined;
                const p = sponsorProblems(d);
                if (p) return send(res, 400, { error: p });
                writeJson(F.sponsors, d);
                return send(res, 200, d);
            }

            if (path === "/admin/api/badge" && req.method === "POST") {
                const b = await body(req, 3_000_000);
                const s = d.sponsors[b.id];
                if (!s) return send(res, 404, { error: "add the sponsor first" });
                const tier = d.tiers[s.tier];
                if ((s.badges ?? []).length >= tier.badges) return send(res, 400, { error: `${tier.name} allows only ${tier.badges} badge(s)` });
                const buf = Buffer.from(String(b.data || ""), "base64");
                const type = sniff(buf);
                if (!type) return send(res, 400, { error: "image must be png, jpg, gif or webp" });
                if (buf.length > 512 * 1024) return send(res, 400, { error: "image over 512 KB" });
                const name = `${b.id}-${Date.now().toString(36)}.${type.ext}`;
                writeFileSync(join(DATA, "badges", name), buf);
                (s.badges ??= []).push({ tooltip: String(b.tooltip || tier.name).slice(0, 60), badge: `${PUBLIC_URL}/badges/${name}` });
                writeJson(F.sponsors, d);
                return send(res, 200, d);
            }

            if (path === "/admin/api/custom" && req.method === "POST") {
                const b = await body(req, 3_000_000);
                if (!ID.test(b.id || "")) return send(res, 400, { error: "Discord ID must be 15-22 digits" });
                const list = (d.custom ??= {})[b.id] ??= [];
                if (list.length >= 10) return send(res, 400, { error: "10 custom badges is the maximum per person" });
                const buf = Buffer.from(String(b.data || ""), "base64");
                const type = sniff(buf);
                if (!type) return send(res, 400, { error: "image must be png, jpg, gif or webp" });
                if (buf.length > 512 * 1024) return send(res, 400, { error: "image over 512 KB" });
                const name = `c-${b.id}-${Date.now().toString(36)}.${type.ext}`;
                writeFileSync(join(DATA, "badges", name), buf);
                list.push({ tooltip: String(b.tooltip || "Shutcord").slice(0, 60), badge: `${PUBLIC_URL}/badges/${name}` });
                writeJson(F.sponsors, d);
                return send(res, 200, d);
            }

            const cm = /^\/admin\/api\/custom\/(\d+)\/(\d+)$/.exec(path);
            if (cm && req.method === "DELETE") {
                const list = d.custom?.[cm[1]];
                if (!list?.[Number(cm[2])]) return send(res, 404, { error: "not found" });
                const [gone] = list.splice(Number(cm[2]), 1);
                const f = join(DATA, "badges", gone.badge.split("/").pop());
                if (gone.badge.startsWith(PUBLIC_URL) && existsSync(f)) unlinkSync(f);
                if (!list.length) delete d.custom[cm[1]];
                writeJson(F.sponsors, d);
                return send(res, 200, d);
            }

            const dm = /^\/admin\/api\/sponsor\/(\d+)(?:\/badge\/(\d+))?$/.exec(path);
            if (dm && req.method === "DELETE") {
                const s = d.sponsors[dm[1]];
                if (!s) return send(res, 404, { error: "not found" });
                const drop = u => { const f = join(DATA, "badges", u.split("/").pop()); if (u.startsWith(PUBLIC_URL) && existsSync(f)) unlinkSync(f); };
                if (dm[2] !== undefined) { const [gone] = (s.badges ?? []).splice(Number(dm[2]), 1); if (gone) drop(gone.badge); }
                else { (s.badges ?? []).forEach(x => drop(x.badge)); delete d.sponsors[dm[1]]; }
                writeJson(F.sponsors, d);
                return send(res, 200, d);
            }
            return send(res, 404, { error: "no such admin route" });
        }

        // GitHub Sponsors webhook
        if (path === "/webhooks/github" && req.method === "POST") {
            if (!WEBHOOK_SECRET) return send(res, 503, { error: "GITHUB_WEBHOOK_SECRET not set" });
            const raw = await rawBody(req);
            const sig = req.headers["x-hub-signature-256"] || "";
            if (!safeEq(sig, "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex"))) return send(res, 401, { error: "bad signature" });
            const ev = req.headers["x-github-event"];
            if (ev === "ping") return send(res, 200, { ok: true });
            if (ev !== "sponsorship") return send(res, 200, { ignored: ev });
            await onSponsorship(JSON.parse(raw.toString()));
            return send(res, 200, { ok: true });
        }

        // sponsor links Discord + GitHub and joins the server
        if (path === "/link") {
            if (!CLIENT_ID) return send(res, 503, "Not configured.", { "content-type": "text/plain" });
            const state = randomBytes(16).toString("hex");
            const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: PUBLIC_URL + "/callback", response_type: "code", scope: "identify connections guilds.join", state });
            return send(res, 302, "", { location: "https://discord.com/oauth2/authorize?" + q, "set-cookie": [`sc_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`, "sc_next=link; HttpOnly; Path=/; Max-Age=600; SameSite=Lax"] });
        }

        // profile login (Discord OAuth2, scope identify only)
        if (path === "/login") {
            if (!CLIENT_ID) return send(res, 503, "Profile login is not configured (DISCORD_CLIENT_ID).", { "content-type": "text/plain" });
            const state = randomBytes(16).toString("hex");
            const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: PUBLIC_URL + "/callback", response_type: "code", scope: "identify", state, prompt: "none" });
            const next = url.searchParams.get("next") === "admin" ? "admin" : "me";
            return send(res, 302, "", { location: "https://discord.com/oauth2/authorize?" + q, "set-cookie": [`sc_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`, `sc_next=${next}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`] });
        }
        if (path === "/callback") {
            const state = /(?:^|;\s*)sc_state=([^;]+)/.exec(req.headers.cookie || "")?.[1];
            const code = url.searchParams.get("code");
            if (!state || state !== url.searchParams.get("state") || !code) return send(res, 400, "Login expired, try again.", { "content-type": "text/plain" });
            const tok = await fetch(DISCORD_API + "/oauth2/token", {
                method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: PUBLIC_URL + "/callback" })
            }).then(r => r.json());
            if (!tok.access_token) return send(res, 400, "Discord refused the login.", { "content-type": "text/plain" });
            const me = await fetch(DISCORD_API + "/users/@me", { headers: { authorization: "Bearer " + tok.access_token } }).then(r => r.json());
            if (/(?:^|;\s*)sc_next=link/.test(req.headers.cookie || "")) {
                if (!ID.test(me.id || "")) return page(res, "Shutcord", "Could not read your Discord ID.");
                const conns = await fetch(DISCORD_API + "/users/@me/connections", { headers: { authorization: "Bearer " + tok.access_token } }).then(r => r.json());
                const gh = Array.isArray(conns) ? conns.find(c => c.type === "github" && c.verified !== false) : null;
                if (!gh) return page(res, "Link your GitHub", "Your Discord account has no GitHub connection. In Discord go to <b>Settings > Connections</b>, add GitHub, then open this link again.");
                const login = lc(gh.name);
                const links = readJson(F.links);
                links[login] = { id: me.id, at: Date.now() };
                writeJson(F.links, links);
                logEvent(`${login} linked Discord ${me.id}`);
                const sp = readJson(F.spons)[login];
                if (!sp?.active) return page(res, "Linked", `Linked GitHub <b>${esc(login)}</b> to your Discord. We don't see an active sponsorship yet. If you just paid, wait a minute and open this link again.`);
                const users = readJson(F.users); users[me.id] = { name: String(me.global_name || me.username || "").slice(0, 40) }; writeJson(F.users, users);
                await reconcile(login, tok.access_token);
                return page(res, "Thank you!", `Linked <b>${esc(login)}</b>. You've been added to the server with your sponsor role, and your badge perks are on. Message the owner to get your badge image set up.`);
            }
            if (!ID.test(me.id || "")) return send(res, 400, "Could not read your Discord ID.", { "content-type": "text/plain" });
            const users = readJson(F.users);
            users[me.id] = { name: String(me.global_name || me.username || "").slice(0, 40) };
            writeJson(F.users, users);
            return send(res, 302, "", { location: state_next(req), "set-cookie": `sc_session=${makeSession(me.id)}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${PUBLIC_URL.startsWith("https") ? "; Secure" : ""}` });
        }
        if (path === "/logout") return send(res, 302, "", { location: "/me", "set-cookie": "sc_session=; Path=/; Max-Age=0" });
        if (path === "/me" && req.method === "GET") return html(res, ME_PAGE);
        if (path === "/me/profile") {
            const id = readSession(req);
            if (!id) return send(res, 401, { error: "not logged in" });
            const all = readJson(F.profiles);
            if (req.method === "GET") return send(res, 200, { id, profile: all[id] ?? {}, allowed: !SPONSORS_ONLY || !!readJson(F.sponsors).sponsors[id] });
            if (req.method === "PUT") {
                if (SPONSORS_ONLY && !readJson(F.sponsors).sponsors[id]) return send(res, 403, { error: "profile styling is for sponsors" });
                const b = await body(req, 10_000);
                const p = {};
                for (const k of ["color", "accent"]) if (b[k]) { if (!HEX.test(b[k])) return send(res, 400, { error: `${k} must look like #aabbcc` }); p[k] = b[k].toLowerCase(); }
                if (b.banner) {
                    let u; try { u = new URL(b.banner); } catch { return send(res, 400, { error: "banner must be a link" }); }
                    if (u.protocol !== "https:" || b.banner.length > 300) return send(res, 400, { error: "banner must be an https link under 300 characters" });
                    p.banner = b.banner;
                }
                if (Object.keys(p).length) all[id] = p; else delete all[id];
                writeJson(F.profiles, all);
                return send(res, 200, { id, profile: all[id] ?? {} });
            }
        }
        if (path === "/") return send(res, 200, "Shutcord API", { "content-type": "text/plain" });
        send(res, 404, { error: "not found" });
    } catch (e) {
        send(res, e.status || 500, { error: e.status ? e.message : "server error" });
        if (!e.status) console.error(e);
    }
});

const STYLE = `<style>:root{color-scheme:dark}body{margin:0;background:#151518;color:#e4e4e7;font:15px system-ui,sans-serif}main{max-width:720px;margin:32px auto;padding:0 16px}
h1{font-size:20px}input,select,button{font:inherit;background:#232328;color:#e4e4e7;border:1px solid #2f2f36;border-radius:8px;padding:8px 10px}button{cursor:pointer;background:#d4d4d8;color:#121214;border:0;font-weight:600}
button.x{background:#2c2c32;color:#e4e4e7}.card{background:#1b1b1f;border:1px solid #2f2f36;border-radius:12px;padding:14px;margin:12px 0}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
img.b{width:36px;height:36px;border-radius:50%;background:#2c2c32}small{color:#8d8d96}#msg{min-height:20px;color:#fca5a5}</style>`;

const ADMIN_PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Shutcord dashboard</title>${STYLE}<main>
<h1>Shutcord dashboard</h1><div id=top class=card>Loading…</div><div id=msg></div>
<div id=app hidden>
<div id=adminsCard class=card hidden><b>Admins</b> <small>(only you, the owner, can change this)</small><div id=admins></div><div class=row><input id=aid placeholder="Discord user ID" size=22><button id=aadd>Make admin</button></div></div>
<div id=integCard class=card hidden><b>Discord roles and GitHub Sponsors</b> <small>(owner only)</small><div id=integ></div></div>
<div class=card><b>Add or change a sponsor</b><div class=row><input id=id placeholder="Discord user ID" size=22><select id=tier></select><input id=gh placeholder="GitHub name (optional)"><button id=add>Save</button></div></div>
<div class=card><b>Custom badges</b> <small>(for anyone: staff, testers, friends. Not tied to a tier, up to 10 each)</small>
<div class=row><input id=cid placeholder="Discord user ID" size=22><input id=ctip placeholder="Tooltip, e.g. Staff" size=18><input id=cfile type=file accept="image/*"><button id=cadd>Add badge</button></div><div id=clist></div></div>
<div id=list></div></div>
<script>
const $=i=>document.getElementById(i);let D,ME;const msg=t=>$('msg').textContent=t||'';
async function api(p,m='GET',b){const r=await fetch('/admin/api/'+p,{method:m,headers:{'content-type':'application/json','x-requested-with':'shutcord'},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||r.status);e.status=r.status;throw e}return j}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function draw(){$('app').hidden=false;$('tier').innerHTML=Object.entries(D.tiers).map(([k,t])=>'<option value='+k+'>'+esc(t.name)+' ($'+t.usd+', '+t.badges+' badges)</option>').join('');
drawCustom();$('list').innerHTML='';for(const [id,s] of Object.entries(D.sponsors)){const t=D.tiers[s.tier]||{name:'?',badges:0};const c=document.createElement('div');c.className='card';
c.innerHTML='<div class=row><b>'+esc(id)+'</b><small>'+esc(t.name)+(s.github?' · '+esc(s.github):'')+' · '+(s.badges||[]).length+'/'+t.badges+' badges</small></div><div class=row></div>';
const r=c.lastChild;(s.badges||[]).forEach((b,i)=>{const im=document.createElement('img');im.className='b';im.src=b.badge;im.title=b.tooltip||'';const x=document.createElement('button');x.className='x';x.textContent='remove';x.onclick=()=>run(()=>api('sponsor/'+id+'/badge/'+i,'DELETE'));r.append(im,x)});
if((s.badges||[]).length<t.badges){const f=document.createElement('input');f.type='file';f.accept='image/*';const tt=document.createElement('input');tt.placeholder='tooltip';const u=document.createElement('button');u.textContent='Add badge';
u.onclick=()=>{const file=f.files[0];if(!file)return msg('pick an image first');const fr=new FileReader();fr.onload=()=>run(()=>api('badge','POST',{id,tooltip:tt.value,data:fr.result.split(',')[1]}));fr.readAsDataURL(file)};r.append(f,tt,u)}
const del=document.createElement('button');del.className='x';del.textContent='Remove sponsor';del.onclick=()=>confirm('Remove '+id+'?')&&run(()=>api('sponsor/'+id,'DELETE'));r.append(del);$('list').append(c)}}
function drawCustom(){$('clist').innerHTML='';for(const [id,list] of Object.entries(D.custom||{})){const r=document.createElement('div');r.className='row';r.innerHTML='<b>'+esc(id)+'</b>';
list.forEach((b,i)=>{const im=document.createElement('img');im.className='b';im.src=b.badge;im.title=b.tooltip||'';const x=document.createElement('button');x.className='x';x.textContent='remove';x.onclick=()=>run(()=>api('custom/'+id+'/'+i,'DELETE'));r.append(im,x)});$('clist').append(r)}}
function drawInteg(I){$('integCard').hidden=false;const el=$('integ');el.innerHTML='';
const po=document.createElement('p');po.innerHTML='GitHub check: <b>'+(I.poll.configured?'on for '+esc(I.poll.account)+', every '+I.poll.every+' min':'off (set GITHUB_TOKEN and GITHUB_SPONSORED_ACCOUNT)')+'</b>'+(I.poll.last?'<br><small>Last run '+esc(I.poll.last.replace('T',' ').slice(0,16))+' UTC: '+(I.poll.ok?'ok':'FAILED')+' · '+esc(I.poll.message)+'</small>':'');if(I.poll.configured){const nb=document.createElement('button');nb.textContent='Check now';nb.onclick=async()=>{try{msg();await api('integration/poll','POST',{});drawInteg(await api('integration'))}catch(e){msg(e.message)}};po.append(' ',nb)}el.append(po);
const st=document.createElement('p');st.innerHTML='Bot: <b>'+(I.botConfigured?'ready':'not set (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID)')+'</b> · Webhook secret: <b>'+(I.webhookConfigured?'set':'not set (GITHUB_WEBHOOK_SECRET)')+'</b><br><small>GitHub webhook URL: '+esc(I.webhookUrl)+'<br>Link page for sponsors: '+esc(I.linkUrl)+'</small>';el.append(st);
const inputs={};for(const [k,t] of Object.entries(D.tiers)){const r=document.createElement('div');r.className='row';r.innerHTML='<b style="width:110px">'+esc(t.name)+'</b>';const i=document.createElement('input');i.placeholder='Discord role ID';i.size=22;i.value=I.tierRoles[k]||'';inputs[k]=i;r.append(i);el.append(r)}
const b=document.createElement('button');b.textContent='Save roles';b.onclick=async()=>{try{msg();const tr={};for(const k in inputs)tr[k]=inputs[k].value.trim();drawInteg(await api('integration','POST',{tierRoles:tr}))}catch(e){msg(e.message)}};el.append(b);
const ev=document.createElement('div');ev.innerHTML='<p><b>Recent events</b></p>'+(I.events.length?I.events.map(e=>'<div><small>'+esc(e.at.replace('T',' ').slice(0,16))+' · '+esc(e.text)+'</small></div>').join(''):'<small>Nothing yet.</small>');el.append(ev)}
function drawAdmins(A){$('adminsCard').hidden=false;$('admins').innerHTML='';const row=(p,owner)=>{const d=document.createElement('div');d.className='row';d.innerHTML='<b>'+esc(p.name||'(not logged in yet)')+'</b><small>'+esc(p.id)+(owner?' · owner':'')+'</small>';
if(!owner){const x=document.createElement('button');x.className='x';x.textContent='remove';x.onclick=()=>runA(()=>api('admins','DELETE',{id:p.id}));d.append(x)}$('admins').append(d)};row(A.owner,true);A.admins.forEach(a=>row(a,false))}
async function run(f){try{msg();D=await f();draw()}catch(e){msg(e.message)}}
async function runA(f){try{msg();drawAdmins(await f())}catch(e){msg(e.message)}}
(async()=>{try{ME=await api('me')}catch(e){$('top').innerHTML='<a href="/login?next=admin"><button>Log in with Discord</button></a>';return}
if(!ME.role){$('top').innerHTML='Logged in as '+esc(ME.name||ME.id)+', but you are not an admin. <a href=/logout><small>Log out</small></a>';return}
$('top').innerHTML='Logged in as <b>'+esc(ME.name||ME.id)+'</b> <small>('+ME.role+')</small> <a href=/logout><small>Log out</small></a>';
D=await api('data');draw();if(ME.role==='owner'){drawAdmins(await api('admins'));drawInteg(await api('integration'));$('aadd').onclick=()=>runA(()=>api('admins','POST',{id:$('aid').value.trim()}))}
$('cadd').onclick=()=>{const file=$('cfile').files[0];if(!file)return msg('pick an image first');const fr=new FileReader();fr.onload=()=>run(()=>api('custom','POST',{id:$('cid').value.trim(),tooltip:$('ctip').value,data:fr.result.split(',')[1]}));fr.readAsDataURL(file)};
$('add').onclick=()=>run(()=>api('sponsor','POST',{id:$('id').value.trim(),tier:$('tier').value,github:$('gh').value.trim()}))})();
</script></main>`;

const ME_PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Shutcord profile</title>${STYLE}<main>
<h1>Your Shutcord profile</h1><p><small>Only people using Shutcord see this.</small></p><div id=out class=card>Loading…</div>
<script>
const o=document.getElementById('out');
fetch('/me/profile').then(async r=>{if(r.status===401){o.innerHTML='<a href=/login><button>Log in with Discord</button></a>';return}
const j=await r.json();if(!j.allowed){o.textContent='Profile styling is for sponsors.';return}const p=j.profile;
o.innerHTML='<div class=row><label>Profile colour <input id=c type=color value="'+(p.color||'#d4d4d8')+'"></label><label>Accent <input id=a type=color value="'+(p.accent||'#71717a')+'"></label></div><div class=row><input id=b size=48 placeholder="Banner image link (https)" value="'+(p.banner||'')+'"></div><div class=row><button id=s>Save</button><button class=x id=n>Clear</button><a href=/logout><small>Log out</small></a></div><div id=msg></div>';
const save=b=>fetch('/me/profile',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(async r=>{const x=await r.json();document.getElementById('msg').textContent=r.ok?'Saved. Others see it within a minute.':x.error});
document.getElementById('s').onclick=()=>save({color:c.value,accent:a.value,banner:b.value.trim()});document.getElementById('n').onclick=()=>save({});});
</script></main>`;

server.listen(PORT, () => {
    console.log(`Shutcord API on ${PUBLIC_URL} (port ${PORT}). Admin: ${PUBLIC_URL}/admin`);
    if (pollConfigured()) {
        console.log(`Checking GitHub sponsors of ${GITHUB_ACCOUNT} every ${POLL_MINUTES} minutes.`);
        setTimeout(pollGithub, 5000);
        setInterval(pollGithub, POLL_MINUTES * 60_000);
    }
});
