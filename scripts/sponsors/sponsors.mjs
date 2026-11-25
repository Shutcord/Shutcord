#!/usr/bin/node
/*
 * Shutcord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Manage sponsors.json without editing it by hand. No dependencies.
//   node scripts/sponsors/sponsors.mjs list
//   node scripts/sponsors/sponsors.mjs add <discordId> <tier> [--github name] [--tooltip text] [--image file.png]
//   node scripts/sponsors/sponsors.mjs remove <discordId>
//   node scripts/sponsors/sponsors.mjs validate
//   node scripts/sponsors/sponsors.mjs readme      (rewrites the sponsor avatars in README.md)

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = join(root, "sponsors.json");
const README = join(root, "README.md");
const RAW = "https://raw.githubusercontent.com/Shutcord/Shutcord/main/badges/";
const HOSTS = ["raw.githubusercontent.com", "cdn.discordapp.com"];
const START = "<!-- sponsors:start -->";
const END = "<!-- sponsors:end -->";

const load = () => JSON.parse(readFileSync(FILE, "utf8"));
const save = data => writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
const fail = msg => { console.error("Error: " + msg); process.exit(1); };

function parseFlags(args) {
    const flags = {}, rest = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i];
        else rest.push(args[i]);
    }
    return { flags, rest };
}

function problems(data) {
    const out = [];
    if (!data.tiers || !data.sponsors) return ["sponsors.json needs `tiers` and `sponsors`"];
    for (const [id, s] of Object.entries(data.sponsors)) {
        if (!/^\d{15,22}$/.test(id)) out.push(`${id}: not a Discord user ID (15-22 digits)`);
        const tier = data.tiers[s.tier];
        if (!tier) { out.push(`${id}: unknown tier "${s.tier}"`); continue; }
        const badges = s.badges ?? [];
        if (badges.length > tier.badges) out.push(`${id}: ${badges.length} badges but ${tier.name} allows ${tier.badges}`);
        for (const b of badges) {
            try {
                const u = new URL(b.badge);
                if (u.protocol !== "https:" || !HOSTS.includes(u.hostname)) throw 0;
            } catch { out.push(`${id}: badge URL must be https on ${HOSTS.join(" or ")}: ${b.badge}`); }
        }
    }
    return out;
}

const [cmd, ...args] = process.argv.slice(2);
const { flags, rest } = parseFlags(args);

switch (cmd) {
    case "list": {
        const d = load();
        for (const [id, s] of Object.entries(d.sponsors))
            console.log(`${id}  ${d.tiers[s.tier]?.name ?? "??" + s.tier}  badges ${(s.badges ?? []).length}/${d.tiers[s.tier]?.badges ?? 0}  ${s.github ?? ""}`);
        if (!Object.keys(d.sponsors).length) console.log("No sponsors yet.");
        break;
    }
    case "add": {
        const [id, tierKey] = rest;
        const d = load();
        if (!id || !tierKey) fail("usage: add <discordId> <tier> [--github name] [--tooltip text] [--image file.png]");
        const tier = d.tiers[tierKey];
        if (!tier) fail(`unknown tier "${tierKey}". Tiers: ${Object.keys(d.tiers).join(", ")}`);
        const s = d.sponsors[id] ??= { tier: tierKey };
        s.tier = tierKey;
        if (flags.github) s.github = flags.github;
        if (flags.image) {
            if (!existsSync(flags.image)) fail("image not found: " + flags.image);
            if (tier.badges === 0) fail(`${tier.name} has no badge`);
            if ((s.badges?.length ?? 0) >= tier.badges) fail(`${tier.name} allows only ${tier.badges} badge(s)`);
            const name = `${id}-${(s.badges?.length ?? 0) + 1}${/\.[a-z0-9]+$/i.exec(flags.image)?.[0] ?? ".png"}`;
            copyFileSync(flags.image, join(root, "badges", name));
            (s.badges ??= []).push({ tooltip: flags.tooltip || `${tier.name}`, badge: RAW + name });
        }
        const errs = problems(d);
        if (errs.length) fail(errs.join("\n"));
        save(d);
        console.log(`Saved ${id} as ${tier.name}.`);
        break;
    }
    case "remove": {
        const d = load();
        if (!d.sponsors[rest[0]]) fail("not found: " + rest[0]);
        delete d.sponsors[rest[0]];
        save(d);
        console.log("Removed " + rest[0] + ". Their badge files in badges/ can be deleted by hand.");
        break;
    }
    case "validate": {
        const errs = problems(load());
        if (errs.length) fail(errs.join("\n"));
        console.log("sponsors.json is valid.");
        break;
    }
    case "readme": {
        const d = load();
        const order = Object.keys(d.tiers).reverse();
        const people = Object.values(d.sponsors).filter(s => s.github)
            .sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
        const html = people.length
            ? people.map(s => `<a href="https://github.com/${s.github}"><img src="https://github.com/${s.github}.png?size=64" width="48" height="48" alt="${s.github}" title="${s.github}"></a>`).join(" ")
            : "_Be the first. See the Sponsor button on this repo._";
        const md = readFileSync(README, "utf8");
        if (!md.includes(START)) fail(`README.md has no ${START} marker`);
        writeFileSync(README, md.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${html}\n${END}`));
        console.log(`README updated with ${people.length} sponsor(s).`);
        break;
    }
    default:
        console.log("Commands: list | add <discordId> <tier> [--github n] [--tooltip t] [--image f] | remove <discordId> | validate | readme");
}
