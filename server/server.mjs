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
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
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
const { env } = process;
const PORT = Number(env.PORT || 8787);
const DATA = env.DATA_DIR || join(here, "data");
const PUBLIC_URL = (env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const OWNER_ID = env.OWNER_ID || "";
const CLIENT_ID = env.DISCORD_CLIENT_ID || "";
const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET || "";
const SPONSORS_ONLY = env.PROFILES_SPONSORS_ONLY === "1";
const BOT_TOKEN = env.DISCORD_BOT_TOKEN || "";
const GUILD_ID = env.DISCORD_GUILD_ID || "";
const IMPORT_URL = env.IMPORT_URL || "https://raw.githubusercontent.com/Shutcord/Shutcord/main/sponsors.json";
const DISCORD_API = (env.DISCORD_API || "https://discord.com/api").replace(/\/$/, "");

if (!/^\d{15,22}$/.test(OWNER_ID)) {
    console.error("Set OWNER_ID to your Discord user ID (Developer Mode, right click yourself, Copy User ID).");
    process.exit(1);
}
if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET)
    console.warn("DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET are not set: nobody can log in to the dashboard until you set them.");

mkdirSync(join(DATA, "badges"), { recursive: true });
const BANNER_HOSTS = ["cdn.discordapp.com", "media.discordapp.net", "i.imgur.com", "i.ibb.co"];
const F = { sponsors: join(DATA, "sponsors.json"), profiles: join(DATA, "profiles.json"), admins: join(DATA, "admins.json"), integ: join(DATA, "integration.json"), users: join(DATA, "users.json"), secret: join(DATA, "secret") };
if (!existsSync(F.sponsors)) {
    const seed = join(here, "..", "sponsors.json");
    writeFileSync(F.sponsors, existsSync(seed) ? readFileSync(seed) : JSON.stringify({ tiers: {}, sponsors: {} }));
}
if (!existsSync(F.profiles)) writeFileSync(F.profiles, "{}");
if (!existsSync(F.admins)) writeFileSync(F.admins, "[]");
if (!existsSync(F.users)) writeFileSync(F.users, "{}");
if (!existsSync(F.integ)) writeFileSync(F.integ, "{\"tierRoles\":{}}");
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
const userCard = id => {
    const u = readJson(F.users)[id] ?? {};
    return { id, name: u.name, handle: u.handle, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.png?size=128` : null };
};
const userName = id => readJson(F.users)[id]?.name;

// ---------- Discord roles ----------
const botReady = () => !!(BOT_TOKEN && GUILD_ID);
const lc = s => String(s || "").toLowerCase();

async function discordBot(method, path, json) {
    const r = await fetch(DISCORD_API + path, { method, headers: { authorization: "Bot " + BOT_TOKEN, "content-type": "application/json" }, body: json ? JSON.stringify(json) : undefined });
    return r.status;
}

/** Gives the member the role of `tierKey` and takes the other tier roles away (null = take all away). Returns a problem text or null */
async function syncRoles(discordId, tierKey) {
    if (!botReady()) return null;
    const roles = readJson(F.integ).tierRoles;
    let problem = null;
    for (const [k, id] of Object.entries(roles)) {
        if (!id) continue;
        const st = await discordBot(k === tierKey ? "PUT" : "DELETE", `/guilds/${GUILD_ID}/members/${discordId}/roles/${id}`);
        if (k === tierKey && st >= 300) problem = st === 404 ? "they are not in your Discord server yet" : `Discord refused (HTTP ${st}): is the bot's role above the tier roles?`;
    }
    return problem;
}

const userNames = () => Object.fromEntries(Object.entries(readJson(F.users)).map(([id, u]) => [id, u.name]));
const userHandles = () => Object.fromEntries(Object.entries(readJson(F.users)).map(([id, u]) => [id, u.handle || ""]));
const out = d => ({ ...d, names: userNames(), handles: userHandles() });

function rememberUser(user) {
    if (!user?.id) return;
    const users = readJson(F.users);
    users[user.id] = { name: String(user.global_name || user.username || "").slice(0, 40), handle: String(user.username || "").slice(0, 40), avatar: /^\w{1,40}$/.test(user.avatar || "") ? user.avatar : users[user.id]?.avatar };
    writeJson(F.users, users);
    return users[user.id];
}

async function discordBotJson(path) {
    try {
        const r = await fetch(DISCORD_API + path, { headers: { authorization: "Bot " + BOT_TOKEN } });
        return r.ok ? await r.json() : null;
    } catch { return null; }
}

/** Name for a Discord ID: from the file, else asked from Discord with the bot (best effort) */
async function resolveUser(id) {
    return readJson(F.users)[id] ?? (botReady() ? rememberUser(await discordBotJson("/users/" + id)) : undefined);
}

function storeBadgeImage(buf, prefix, maxKb = 512) {
    const type = sniff(buf);
    if (!type) return { error: "image must be png, jpg, gif or webp" };
    if (buf.length > maxKb * 1024) return { error: `image over ${maxKb} KB` };
    const name = `${prefix}-${Date.now().toString(36)}.${type.ext}`;
    writeFileSync(join(DATA, "badges", name), buf);
    return { url: `${PUBLIC_URL}/badges/${name}` };
}

const dropBadgeFile = url => {
    const f = join(DATA, "badges", String(url).split("/").pop());
    if (String(url).startsWith(PUBLIC_URL) && existsSync(f)) unlinkSync(f);
};

// ---------- routes ----------
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, PUBLIC_URL);
        const path = url.pathname;
        if (req.method === "OPTIONS") return send(res, 204, "", { "access-control-allow-methods": "GET,POST,PUT,DELETE", "access-control-allow-headers": "authorization,content-type" });
        if (limited(req, req.method === "GET" ? 240 : 40)) return send(res, 429, { error: "slow down" });

        // public
        if (path === "/sponsors.json") return send(res, 200, readFileSync(F.sponsors), { "content-type": "application/json", "cache-control": "public, max-age=60" });
        if (path === "/profiles.json") return send(res, 200, readFileSync(F.profiles), { "content-type": "application/json", "cache-control": "public, max-age=60" });
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

            if (path === "/admin/api/integration") {
                if (role !== "owner") return send(res, 403, { error: "only the owner changes this" });
                const cfg = readJson(F.integ);
                const view = () => ({ botConfigured: botReady(), tierRoles: cfg.tierRoles });
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

            if (path === "/admin/api/data" && req.method === "GET") return send(res, 200, out(d));

            if (path === "/admin/api/lookup" && req.method === "GET") {
                const q = (url.searchParams.get("q") || "").trim().slice(0, 50);
                if (!q) return send(res, 200, []);
                const found = new Map();
                if (ID.test(q)) found.set(q, { id: q, name: (await resolveUser(q))?.name ?? null });
                for (const [id, u] of Object.entries(readJson(F.users))) if (lc(u.name + " " + (u.handle || "")).includes(lc(q))) found.set(id, { id, name: u.name });
                if (botReady() && !ID.test(q)) {
                    const members = await discordBotJson(`/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(q)}&limit=10`);
                    for (const m of Array.isArray(members) ? members : []) { const u = rememberUser(m.user); if (u) found.set(m.user.id, { id: m.user.id, name: u.name }); }
                }
                return send(res, 200, [...found.values()].slice(0, 15));
            }

            const pm = /^\/admin\/api\/(?:sponsor\/(\d+)\/badge|custom\/(\d+))\/(\d+)$/.exec(path);
            if (pm && req.method === "PATCH") {
                const id = pm[1] || pm[2];
                const item = (pm[1] ? d.sponsors[id]?.badges : d.custom?.[id])?.[Number(pm[3])];
                if (!item) return send(res, 404, { error: "badge not found" });
                const b = await body(req, 3_000_000);
                if (typeof b.tooltip === "string") item.tooltip = b.tooltip.slice(0, 60);
                if (b.data) {
                    const r = storeBadgeImage(Buffer.from(String(b.data), "base64"), (pm[1] ? "" : "c-") + id);
                    if (r.error) return send(res, 400, { error: r.error });
                    dropBadgeFile(item.badge);
                    item.badge = r.url;
                }
                writeJson(F.sponsors, d);
                return send(res, 200, out(d));
            }

            if (path === "/admin/api/import" && req.method === "POST") {
                let src;
                try { src = await fetch(IMPORT_URL, { headers: { "cache-control": "no-cache" } }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
                catch (e) { return send(res, 502, { error: "Could not download " + IMPORT_URL + " (" + e.message + ")" }); }
                let added = 0, skipped = 0;
                for (const [id, s] of Object.entries(src.sponsors ?? {})) {
                    if (!ID.test(id) || !d.tiers[s?.tier] || d.sponsors[id]) { skipped++; continue; }
                    d.sponsors[id] = { tier: s.tier, ...(s.github ? { github: String(s.github) } : {}), badges: (s.badges ?? []).slice(0, d.tiers[s.tier].badges) };
                    added++;
                }
                for (const [id, list] of Object.entries(src.custom ?? {})) {
                    if (!ID.test(id) || !Array.isArray(list) || d.custom?.[id]) { skipped++; continue; }
                    (d.custom ??= {})[id] = list.filter(b => b && typeof b.badge === "string").slice(0, 10);
                    added++;
                }
                writeJson(F.sponsors, d);
                for (const id of Object.keys(d.sponsors)) await resolveUser(id);
                return send(res, 200, { ...out(d), imported: { added, skipped } });
            }

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
                await resolveUser(b.id);
                const problem = await syncRoles(b.id, b.tier);
                return send(res, 200, { ...out(d), note: problem ? `Saved, but the role was not given: ${problem}.` : undefined });
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
                return send(res, 200, out(d));
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
                await resolveUser(b.id);
                return send(res, 200, out(d));
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
                return send(res, 200, out(d));
            }

            const dm = /^\/admin\/api\/sponsor\/(\d+)(?:\/badge\/(\d+))?$/.exec(path);
            if (dm && req.method === "DELETE") {
                const s = d.sponsors[dm[1]];
                if (!s) return send(res, 404, { error: "not found" });
                const drop = u => { const f = join(DATA, "badges", u.split("/").pop()); if (u.startsWith(PUBLIC_URL) && existsSync(f)) unlinkSync(f); };
                if (dm[2] !== undefined) { const [gone] = (s.badges ?? []).splice(Number(dm[2]), 1); if (gone) drop(gone.badge); }
                else { (s.badges ?? []).forEach(x => drop(x.badge)); delete d.sponsors[dm[1]]; await syncRoles(dm[1], null); }
                writeJson(F.sponsors, d);
                return send(res, 200, out(d));
            }
            return send(res, 404, { error: "no such admin route" });
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
            if (!ID.test(me.id || "")) return send(res, 400, "Could not read your Discord ID.", { "content-type": "text/plain" });
            rememberUser(me);
            return send(res, 302, "", { location: state_next(req), "set-cookie": `sc_session=${makeSession(me.id)}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${PUBLIC_URL.startsWith("https") ? "; Secure" : ""}` });
        }
        if (path === "/logout") return send(res, 302, "", { location: "/me", "set-cookie": "sc_session=; Path=/; Max-Age=0" });
        if (path === "/me" && req.method === "GET") return html(res, ME_PAGE);
        if (path === "/me/profile") {
            const id = readSession(req);
            if (!id) return send(res, 401, { error: "not logged in" });
            const all = readJson(F.profiles);
            if (req.method === "GET") return send(res, 200, { ...userCard(id), profile: all[id] ?? {}, allowed: !SPONSORS_ONLY || !!readJson(F.sponsors).sponsors[id] });
            if (req.method === "PUT") {
                if (SPONSORS_ONLY && !readJson(F.sponsors).sponsors[id]) return send(res, 403, { error: "profile styling is for sponsors" });
                const b = await body(req, 10_000);
                const p = {};
                for (const k of ["color", "accent"]) if (b[k]) { if (!HEX.test(b[k])) return send(res, 400, { error: `${k} must look like #aabbcc` }); p[k] = b[k].toLowerCase(); }
                if (b.banner) {
                    let u; try { u = new URL(b.banner); } catch { return send(res, 400, { error: "banner must be a link" }); }
                    if ((u.protocol !== "https:" && u.origin !== new URL(PUBLIC_URL).origin) || b.banner.length > 600) return send(res, 400, { error: "banner must be an https link under 600 characters" });
                    if (!BANNER_HOSTS.includes(u.hostname) && u.origin !== new URL(PUBLIC_URL).origin) return send(res, 400, { error: "use the upload button, or a link from " + BANNER_HOSTS.join(", ") });
                    p.banner = b.banner;
                }
                if (all[id]?.banner && all[id].banner !== p.banner) dropBadgeFile(all[id].banner);
                if (Object.keys(p).length) all[id] = p; else delete all[id];
                writeJson(F.profiles, all);
                return send(res, 200, { id, profile: all[id] ?? {} });
            }
        }
        if (path === "/me/banner" && req.method === "POST") {
            const id = readSession(req);
            if (!id) return send(res, 401, { error: "not logged in" });
            if (req.headers["x-requested-with"] !== "shutcord") return send(res, 403, { error: "missing header" });
            if (SPONSORS_ONLY && !readJson(F.sponsors).sponsors[id]) return send(res, 403, { error: "profile styling is for sponsors" });
            const b = await body(req, 3_500_000);
            const r = storeBadgeImage(Buffer.from(String(b.data || ""), "base64"), `banner-${id}`, 2048);
            if (r.error) return send(res, 400, { error: r.error });
            const all = readJson(F.profiles);
            if (all[id]?.banner) dropBadgeFile(all[id].banner);
            all[id] = { ...all[id], banner: r.url };
            writeJson(F.profiles, all);
            return send(res, 200, { id, profile: all[id] });
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
<div id=integCard class=card hidden><b>Discord roles</b> <small>(owner only. Given automatically when you add a sponsor)</small><div id=integ></div></div>
<div class=card><b>Import</b> <small>(copies sponsors and badges that are in the GitHub file but not here yet; nothing is overwritten)</small><div class=row><button id=imp>Import from GitHub file</button><span id=impmsg></span></div></div>
<div class=card><b>Find a person</b> <small>(Discord username or user ID)</small><div class=row><input id=q placeholder="Search…" size=30></div><div id=results></div></div>
<div class=card><b>Add or change a sponsor</b><div class=row><input id=id placeholder="Discord user ID" size=22><select id=tier></select><button id=add>Save</button></div></div>
<div class=card><b>Custom badges</b> <small>(for anyone: staff, testers, friends. Not tied to a tier, up to 10 each)</small>
<div class=row><input id=cid placeholder="Discord user ID" size=22><input id=ctip placeholder="Tooltip, e.g. Staff" size=18><input id=cfile type=file accept="image/*"><button id=cadd>Add badge</button></div><div id=clist></div></div>
<div id=list></div></div>
<script>
const $=i=>document.getElementById(i);let D,ME;const msg=t=>$('msg').textContent=t||'';
async function api(p,m='GET',b){const r=await fetch('/admin/api/'+p,{method:m,headers:{'content-type':'application/json','x-requested-with':'shutcord'},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||r.status);e.status=r.status;throw e}return j}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
const nm=id=>D.names&&D.names[id]?D.names[id]:null;
const who=id=>'<b>'+esc(nm(id)||id)+'</b>'+(nm(id)?' <small>'+esc(id)+'</small>':'');
let Q='',MATCH=new Set();const hit=(id,extra)=>!Q||MATCH.has(id)||(id+' '+(nm(id)||'')+' '+((D.handles&&D.handles[id])||'')+' '+(extra||'')).toLowerCase().includes(Q);
function badgeRow(b,base,paren){const r=document.createElement('div');r.className='row';const im=document.createElement('img');im.className='b';im.src=b.badge;
const tt=document.createElement('input');tt.value=b.tooltip||'';tt.placeholder='tooltip';tt.size=16;const f=document.createElement('input');f.type='file';f.accept='image/*';f.title='Replace the image';
const sv=document.createElement('button');sv.textContent='Save';sv.title='Save the tooltip and/or the new image';
sv.onclick=()=>{const file=f.files[0];const go=data=>run(()=>api(base,'PATCH',{tooltip:tt.value,data}));if(!file)return go();const fr=new FileReader();fr.onload=()=>go(fr.result.split(',')[1]);fr.readAsDataURL(file)};
const x=document.createElement('button');x.className='x';x.textContent='Remove';x.onclick=()=>confirm('Remove this badge?')&&run(()=>api(base,'DELETE'));r.append(im,tt,f,sv,x);return r}
function draw(){$('app').hidden=false;$('tier').innerHTML=Object.entries(D.tiers).map(([k,t])=>'<option value='+k+'>'+esc(t.name)+' ($'+t.usd+', '+t.badges+' badges)</option>').join('');
drawCustom();$('list').innerHTML=Object.keys(D.sponsors).length?'':'<div class=card><small>No sponsors in this list yet. If you added some earlier with pnpm sponsors, press Import above.</small></div>';for(const [id,s] of Object.entries(D.sponsors)){if(!hit(id,(s.github||'')+' '+s.tier))continue;const t=D.tiers[s.tier]||{name:'?',badges:0};const c=document.createElement('div');c.className='card';
c.innerHTML='<div class=row>'+who(id)+'<small>'+esc(t.name)+(s.github?' · '+esc(s.github):'')+' · '+(s.badges||[]).length+'/'+t.badges+' badges</small></div>';
(s.badges||[]).forEach((b,i)=>c.append(badgeRow(b,'sponsor/'+id+'/badge/'+i)));
const r=document.createElement('div');r.className='row';
if((s.badges||[]).length<t.badges){const f=document.createElement('input');f.type='file';f.accept='image/*';const tt=document.createElement('input');tt.placeholder='tooltip';const u=document.createElement('button');u.textContent='Add badge';
u.onclick=()=>{const file=f.files[0];if(!file)return msg('pick an image first');const fr=new FileReader();fr.onload=()=>run(()=>api('badge','POST',{id,tooltip:tt.value,data:fr.result.split(',')[1]}));fr.readAsDataURL(file)};r.append(f,tt,u)}
const del=document.createElement('button');del.className='x';del.textContent='Remove sponsor';del.onclick=()=>confirm('Remove '+id+'?')&&run(()=>api('sponsor/'+id,'DELETE'));r.append(del);c.append(r);$('list').append(c)}}
function drawCustom(){$('clist').innerHTML='';for(const [id,list] of Object.entries(D.custom||{})){if(!hit(id))continue;const c=document.createElement('div');c.className='row';c.style.display='block';c.innerHTML='<div class=row>'+who(id)+'</div>';
list.forEach((b,i)=>c.append(badgeRow(b,'custom/'+id+'/'+i)));$('clist').append(c)}}
function showResults(list){MATCH=new Set(list.map(u=>u.id));if(D)draw();const el=$('results');el.innerHTML='';if(!Q){return}if(!list.length){el.innerHTML='<small>No match. Search finds people who logged in here and (with the bot) members of your Discord server. Pasting a user ID always works.</small>';return}
for(const u of list){const r=document.createElement('div');r.className='row';r.innerHTML=(u.name?'<b>'+esc(u.name)+'</b>':'<b>(unknown name)</b>')+' <small>'+esc(u.id)+'</small>';
const a=document.createElement('button');a.className='x';a.textContent='Use for sponsor';a.onclick=()=>{$('id').value=u.id;$('id').scrollIntoView({block:'center'})};
const b=document.createElement('button');b.className='x';b.textContent='Use for custom badge';b.onclick=()=>{$('cid').value=u.id;$('cid').scrollIntoView({block:'center'})};r.append(a,b);el.append(r)}}
let qt;$('q').oninput=()=>{Q=$('q').value.trim().toLowerCase();MATCH=new Set();if(D)draw();clearTimeout(qt);qt=setTimeout(async()=>{if(!Q)return showResults([]);try{showResults(await api('lookup?q='+encodeURIComponent($('q').value.trim())))}catch(e){msg(e.message)}},300)};
function drawInteg(I){$('integCard').hidden=false;const el=$('integ');el.innerHTML='';
const st=document.createElement('p');st.innerHTML='Bot: <b>'+(I.botConfigured?'ready':'not set up, so no roles are given')+'</b>';el.append(st);
const inputs={};for(const [k,t] of Object.entries(D.tiers)){const r=document.createElement('div');r.className='row';r.innerHTML='<b style="width:110px">'+esc(t.name)+'</b>';const i=document.createElement('input');i.placeholder='Discord role ID';i.size=22;i.value=I.tierRoles[k]||'';inputs[k]=i;r.append(i);el.append(r)}
const b=document.createElement('button');b.textContent='Save roles';b.onclick=async()=>{try{msg();const tr={};for(const k in inputs)tr[k]=inputs[k].value.trim();drawInteg(await api('integration','POST',{tierRoles:tr}))}catch(e){msg(e.message)}};el.append(b)}
function drawAdmins(A){$('adminsCard').hidden=false;$('admins').innerHTML='';const row=(p,owner)=>{const d=document.createElement('div');d.className='row';d.innerHTML='<b>'+esc(p.name||'(not logged in yet)')+'</b><small>'+esc(p.id)+(owner?' · owner':'')+'</small>';
if(!owner){const x=document.createElement('button');x.className='x';x.textContent='remove';x.onclick=()=>runA(()=>api('admins','DELETE',{id:p.id}));d.append(x)}$('admins').append(d)};row(A.owner,true);A.admins.forEach(a=>row(a,false))}
async function run(f){try{msg();D=await f();draw()}catch(e){msg(e.message)}}
async function runA(f){try{msg();drawAdmins(await f())}catch(e){msg(e.message)}}
(async()=>{try{ME=await api('me')}catch(e){$('top').innerHTML='<a href="/login?next=admin"><button>Log in with Discord</button></a>';return}
if(!ME.role){$('top').innerHTML='Logged in as '+esc(ME.name||ME.id)+', but you are not an admin. <a href=/logout><small>Log out</small></a>';return}
$('top').innerHTML='Logged in as <b>'+esc(ME.name||ME.id)+'</b> <small>('+ME.role+')</small> <a href=/logout><small>Log out</small></a>';
D=await api('data');draw();if(ME.role==='owner'){drawAdmins(await api('admins'));drawInteg(await api('integration'));$('aadd').onclick=()=>runA(()=>api('admins','POST',{id:$('aid').value.trim()}))}
$('cadd').onclick=()=>{const file=$('cfile').files[0];if(!file)return msg('pick an image first');const fr=new FileReader();fr.onload=()=>run(()=>api('custom','POST',{id:$('cid').value.trim(),tooltip:$('ctip').value,data:fr.result.split(',')[1]}));fr.readAsDataURL(file)};
$('imp').onclick=async()=>{try{msg();D=await api('import','POST',{});$('impmsg').textContent='Added '+D.imported.added+', skipped '+D.imported.skipped+' (already here or invalid).';draw()}catch(e){msg(e.message)}};
$('add').onclick=async()=>{try{msg();D=await api('sponsor','POST',{id:$('id').value.trim(),tier:$('tier').value});draw();if(D.note)msg(D.note)}catch(e){msg(e.message)}}})();
</script></main>`;

const ME_PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Shutcord profile</title>
<style>
:root{color-scheme:dark;--bg:#121214;--card:#1a1a1e;--line:#2a2a30;--soft:#232328;--txt:#e7e7ea;--dim:#8d8d96;--acc:#d4d4d8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
header{display:flex;align-items:center;justify-content:space-between;max-width:940px;margin:0 auto;padding:22px 16px 6px}
header b{font-size:18px;letter-spacing:.2px}header small{color:var(--dim)}
a{color:var(--dim)}
main{max-width:940px;margin:0 auto;padding:10px 16px 60px;display:grid;grid-template-columns:320px 1fr;gap:20px;align-items:start}
@media(max-width:780px){main{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.card h2{margin:0 0 2px;font-size:14px;font-weight:650}.card p{margin:0 0 12px;color:var(--dim);font-size:13px}
.stack{display:grid;gap:16px}
button{font:inherit;cursor:pointer;border:0;border-radius:9px;padding:9px 14px;font-weight:600;background:var(--acc);color:#121214;transition:opacity .15s,transform .05s}
button:hover{opacity:.9}button:active{transform:translateY(1px)}button:disabled{opacity:.4;cursor:default}
button.g{background:var(--soft);color:var(--txt);border:1px solid var(--line)}
input[type=text]{font:inherit;background:var(--soft);color:var(--txt);border:1px solid var(--line);border-radius:9px;padding:9px 11px;min-width:0;width:100%}
input[type=text]:focus{outline:2px solid #52525b;outline-offset:0}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
/* preview */
.pv{position:sticky;top:16px}
.pcard{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:linear-gradient(180deg,var(--p,#2a2a30),var(--a,#2a2a30));transition:background .2s}
.pbanner{height:108px;background:var(--p,#3a3a42) center/cover no-repeat;transition:background-color .2s}
.pbody{padding:0 14px 14px;position:relative}
.pav{width:84px;height:84px;border-radius:50%;border:6px solid rgba(0,0,0,.55);background:#2f2f36 center/cover;margin-top:-44px;display:grid;place-items:center;font-size:30px;font-weight:700;color:#cfcfd6;box-shadow:0 0 0 0 transparent}
.pin{background:rgba(0,0,0,.5);border-radius:12px;padding:12px;margin-top:10px}
.pname{font-size:19px;font-weight:700;display:flex;gap:8px;align-items:center}
.chip{font:800 10px/1 system-ui;background:rgba(0,0,0,.55);border-radius:5px;padding:4px 5px;letter-spacing:.5px}
.phand{color:#c8c8d0;font-size:13px}
.sec{margin-top:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#d6d6dc}
.ln{height:8px;border-radius:4px;background:rgba(255,255,255,.14);margin-top:7px}
.pnote{color:var(--dim);font-size:12px;margin:10px 2px 0;text-align:center}
/* colour picker */
.pick{display:grid;gap:10px}
.pr{display:flex;gap:10px;align-items:center}
.sw{position:relative;width:46px;height:46px;border-radius:11px;border:1px solid var(--line);overflow:hidden;flex:none}
.sw input{position:absolute;inset:-8px;width:70px;height:70px;border:0;padding:0;cursor:pointer;background:none}
.hex{display:flex;align-items:center;gap:6px;flex:1}.hex span{color:var(--dim)}
.presets{display:flex;gap:7px;flex-wrap:wrap}
.dot{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;outline:1px solid var(--line)}
.dot.on{border-color:#fff}
.pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}
.pair{height:38px;border-radius:9px;border:2px solid transparent;cursor:pointer;padding:0;outline:1px solid var(--line)}
.pair.on{border-color:#fff}
.lab{font-size:12px;color:var(--dim);font-weight:600;margin:2px 0 -2px}
/* switch */
.sw2{display:flex;justify-content:space-between;align-items:center;gap:12px}
.tg{position:relative;width:42px;height:24px;flex:none}.tg input{opacity:0;position:absolute;inset:0;margin:0;cursor:pointer;z-index:1}
.tg i{position:absolute;inset:0;background:#3a3a42;border-radius:99px;transition:.15s}.tg i:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s}
.tg input:checked+i{background:#71717a}.tg input:checked+i:after{transform:translateX(18px)}
/* banner drop */
.drop{border:1.5px dashed #3a3a42;border-radius:12px;padding:16px;text-align:center;color:var(--dim);cursor:pointer;transition:.15s;font-size:13px}
.drop:hover,.drop.over{border-color:#8d8d96;color:var(--txt);background:var(--soft)}
.thumb{height:84px;border-radius:10px;background:var(--soft) center/cover;border:1px solid var(--line)}
details summary{cursor:pointer;color:var(--dim);font-size:13px;margin-top:10px}
/* bar + toasts */
.bar{display:flex;gap:10px;align-items:center;justify-content:flex-end}
.dirty{color:var(--dim);font-size:13px;margin-right:auto}
#toasts{position:fixed;right:16px;top:16px;display:grid;gap:8px;z-index:9;max-width:calc(100vw - 32px)}
.t{display:flex;gap:10px;align-items:center;background:#202026;border:1px solid var(--line);border-left:3px solid #71717a;border-radius:10px;padding:11px 14px;box-shadow:0 8px 28px rgba(0,0,0,.45);animation:in .22s ease-out;min-width:240px}
.t.ok{border-left-color:#4ade80}.t.err{border-left-color:#f87171}.t.out{animation:out .2s ease-in forwards}
@keyframes in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
@keyframes out{to{opacity:0;transform:translateY(6px)}}
.center{max-width:380px;margin:90px auto;text-align:center;display:block}
</style>
<header><b>Shutcord</b><span id=who><small></small></span></header>
<div id=root><main><div class="card" style="grid-column:1/-1;text-align:center;color:var(--dim)">Loading…</div></main></div>
<div id=toasts></div>
<script>
var $=function(i){return document.getElementById(i)};
var S={c:'#6366f1',a:'#a855f7',on:false,b:'',orig:''},U={};
var PRESET=['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#71717a','#d4d4d8','#18181b'];
var PAIRS=[['#6366f1','#a855f7'],['#3b82f6','#14b8a6'],['#f97316','#ec4899'],['#22c55e','#14b8a6'],['#ef4444','#7f1d1d'],['#eab308','#f97316'],['#71717a','#27272a'],['#ec4899','#6366f1']];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function toast(text,kind){var t=document.createElement('div');t.className='t '+(kind||'');t.innerHTML='<span>'+(kind==='ok'?'&#10003;':kind==='err'?'&#10005;':'&#8226;')+'</span><span>'+esc(text)+'</span>';$('toasts').appendChild(t);setTimeout(function(){t.classList.add('out');setTimeout(function(){t.remove()},220)},kind==='err'?5000:2800)}
function hex6(v){v=String(v||'').trim().replace('#','');if(/^[0-9a-f]{3}$/i.test(v))v=v.split('').map(function(x){return x+x}).join('');return /^[0-9a-f]{6}$/i.test(v)?'#'+v.toLowerCase():null}
function snap(){return JSON.stringify([S.on?S.c:'',S.on?S.a:'',S.b])}
function dirty(){return snap()!==S.orig}

function login(msg){$('root').innerHTML='<div class="card center"><h2 style="font-size:18px">Your Shutcord profile</h2><p>'+msg+'</p><a href=/login><button>Log in with Discord</button></a></div>'}

function render(){
  var name=U.name||U.handle||'You';
  var av=U.avatar?'background-image:url('+esc(U.avatar)+')':'';
  $('root').innerHTML='<main>'
  +'<div class=pv><div class=pcard id=pc><div class=pbanner id=pb></div><div class=pbody><div class=pav id=pa style="'+av+'">'+(U.avatar?'':esc(name[0].toUpperCase()))+'</div>'
  +'<div class=pin><div class=pname>'+esc(name)+' <span class=chip>SC</span></div><div class=phand>'+esc(U.handle||'')+'</div>'
  +'<div class=sec>About me</div><div class=ln style="width:80%"></div><div class=ln style="width:55%"></div><div class=sec>Member since</div><div class=ln style="width:35%"></div></div></div></div>'
  +'<div class=pnote>Live preview. Only people using Shutcord see this.</div></div>'
  +'<div class=stack>'
  +'<div class=card><div class=sw2><div><h2>Custom colours</h2><p style="margin:0">Tint your whole profile card with two colours.</p></div><label class=tg><input type=checkbox id=on><i></i></label></div><div id=cbox class=pick style="margin-top:14px"></div></div>'
  +'<div class=card><h2>Banner</h2><p>png, jpg, gif or webp, up to 2 MB. Animated gifs work.</p><div id=bbox></div></div>'
  +'<div class=bar><span class=dirty id=dirty></span><button class=g id=reset>Reset</button><button id=save>Save changes</button></div>'
  +'</div></main>';
  $('on').checked=S.on;$('on').onchange=function(){S.on=this.checked;paint()};
  $('save').onclick=save;$('reset').onclick=function(){load(true)};
  paint(true);
}

function colourRow(label,key){
  return '<div class=lab>'+label+'</div><div class=pr><label class=sw id=sw_'+key+' style="background:'+S[key]+'"><input type=color id=cp_'+key+' value="'+S[key]+'"></label>'
  +'<div class=hex><span>#</span><input type=text id=hx_'+key+' maxlength=7 value="'+S[key].slice(1)+'" spellcheck=false></div></div>'
  +'<div class=presets>'+PRESET.map(function(p){return '<button class="dot'+(S[key]===p?' on':'')+'" data-k='+key+' data-v='+p+' style="background:'+p+'" title='+p+'></button>'}).join('')+'</div>';
}
function paintColourBox(){
  var b=$('cbox');if(!S.on){b.innerHTML='<small style="color:var(--dim)">Off. Your profile uses Discord&#39;s normal colours.</small>';return}
  b.innerHTML='<div class=lab>Quick pairs</div><div class=pairs>'+PAIRS.map(function(p,i){return '<button class="pair'+(S.c===p[0]&&S.a===p[1]?' on':'')+'" data-i='+i+' style="background:linear-gradient(135deg,'+p[0]+','+p[1]+')"></button>'}).join('')+'</div>'
  +colourRow('Profile colour (top)','c')+colourRow('Accent (bottom)','a')
  +'<div class=row><button class=g id=swap>Swap colours</button></div>';
  ['c','a'].forEach(function(k){
    $('cp_'+k).oninput=function(){S[k]=this.value;paint()};
    $('hx_'+k).oninput=function(){var h=hex6(this.value);if(h){S[k]=h;paint()}};
  });
  b.querySelectorAll('.dot').forEach(function(d){d.onclick=function(){S[d.dataset.k]=d.dataset.v;paint(true)}});
  b.querySelectorAll('.pair').forEach(function(d){d.onclick=function(){var p=PAIRS[+d.dataset.i];S.c=p[0];S.a=p[1];paint(true)}});
  $('swap').onclick=function(){var t=S.c;S.c=S.a;S.a=t;paint(true)};
}
function paintBannerBox(){
  var b=$('bbox');
  b.innerHTML=(S.b?'<div class=thumb style="background-image:url('+esc(S.b)+')"></div><div class=row style="margin-top:10px"><button class=g id=rep>Replace</button><button class=g id=rem>Remove</button></div>'
  :'<div class=drop id=dz>Drop an image here or click to choose</div>')
  +'<input type=file id=fl accept="image/png,image/jpeg,image/gif,image/webp" hidden>'
  +'<details><summary>Use a link instead</summary><div class=row style="margin-top:8px"><input type=text id=lk placeholder="https://cdn.discordapp.com/..." value="'+esc(S.b)+'"></div><p style="margin-top:6px">Links from cdn.discordapp.com, media.discordapp.net, i.imgur.com or i.ibb.co. Discord links expire after a while, so uploading is safer.</p></details>';
  var fl=$('fl'),pick=function(){fl.click()};
  if($('dz')){$('dz').onclick=pick;$('dz').ondragover=function(e){e.preventDefault();this.classList.add('over')};$('dz').ondragleave=function(){this.classList.remove('over')};$('dz').ondrop=function(e){e.preventDefault();this.classList.remove('over');if(e.dataTransfer.files[0])up(e.dataTransfer.files[0])}}
  if($('rep'))$('rep').onclick=pick;
  if($('rem'))$('rem').onclick=function(){S.b='';paint(true)};
  fl.onchange=function(){if(fl.files[0])up(fl.files[0])};
  $('lk').onchange=function(){S.b=this.value.trim();paint(true)};
}
function paint(full){
  var pc=$('pc'),pb=$('pb');
  pc.style.setProperty('--p',S.on?S.c:'#2a2a30');pc.style.setProperty('--a',S.on?S.a:'#2a2a30');
  pb.style.backgroundImage=S.b?'url('+S.b+')':'none';pb.style.backgroundColor=S.on?S.c:'#3a3a42';
  if(full||!document.activeElement||document.activeElement.type!=='color'&&document.activeElement.type!=='text'){paintColourBox();paintBannerBox()}
  else{['c','a'].forEach(function(k){if($('sw_'+k))$('sw_'+k).style.background=S[k];if($('cp_'+k)&&document.activeElement!==$('cp_'+k))$('cp_'+k).value=S[k];if($('hx_'+k)&&document.activeElement!==$('hx_'+k))$('hx_'+k).value=S[k].slice(1)})}
  var d=dirty();$('dirty').textContent=d?'Unsaved changes':'';$('save').disabled=!d;$('reset').disabled=!d;
}
function up(file){
  if(file.size>2097152){toast('That image is over 2 MB','err');return}
  var rd=new FileReader();
  rd.onload=function(){
    fetch('/me/banner',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'shutcord'},body:JSON.stringify({data:String(rd.result).split(',')[1]})})
    .then(function(r){return r.json().then(function(x){return{ok:r.ok,x:x}})})
    .then(function(o){if(o.ok){S.b=o.x.profile.banner;U.saved=o.x.profile;var o=JSON.parse(S.orig);o[2]=S.b;S.orig=JSON.stringify(o);paint(true);toast('Banner uploaded','ok')}else toast(o.x.error||'Upload failed','err')})
    .catch(function(){toast('Could not reach the server','err')})
  };rd.readAsDataURL(file);
}
function save(){
  var body=S.on?{color:S.c,accent:S.a,banner:S.b}:{banner:S.b};
  $('save').disabled=true;
  fetch('/me/profile',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  .then(function(r){return r.json().then(function(x){return{ok:r.ok,x:x}})})
  .then(function(o){if(o.ok){S.orig=snap();paint();toast('Saved. Others see it within a few minutes.','ok')}else{paint();toast(o.x.error||'Could not save','err')}})
  .catch(function(){paint();toast('Could not reach the server','err')});
}
function load(keepToast){
  fetch('/me/profile').then(function(r){
    if(r.status===401){login('Log in with Discord to style your profile.');return}
    return r.json().then(function(j){
      if(!j.allowed){login('Profile styling is for sponsors.');return}
      U=j;var p=j.profile||{};
      S.on=!!p.color;S.c=hex6(p.color)||'#6366f1';S.a=hex6(p.accent)||hex6(p.color)||'#a855f7';S.b=p.banner||'';S.orig=snap();
      $('who').innerHTML='<small>'+esc(j.name||j.handle||'')+' &middot; <a href=/logout>Log out</a></small>';
      render();if(keepToast===true)toast('Changes discarded');
    })
  }).catch(function(){login('Could not reach the server.')});
}
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();if($('save')&&!$('save').disabled)save()}});
window.addEventListener('beforeunload',function(e){if($('save')&&dirty()){e.preventDefault();e.returnValue=''}});
load();
</script>
`;

server.listen(PORT, () => console.log(`Shutcord API on ${PUBLIC_URL} (port ${PORT}). Admin: ${PUBLIC_URL}/admin`));
