/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { SHUTCORD_API } from "@shared/api";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";

interface SavedProfile {
    color?: string;
    accent?: string;
    banner?: string;
}

const HEX = /^#[0-9a-f]{6}$/i;
const BANNER_HOSTS = ["cdn.discordapp.com", "media.discordapp.net", "i.imgur.com", "i.ibb.co"];
const REFRESH_MS = 5 * 60 * 1000;

const logger = new Logger("ShutcordProfiles");
let profiles: Record<string, SavedProfile> = {};
let timer: ReturnType<typeof setInterval> | undefined;

async function refresh() {
    if (!SHUTCORD_API) return;
    try {
        const res = await fetch(`${SHUTCORD_API}/profiles.json`);
        if (res.ok) profiles = await res.json();
    } catch (e) {
        logger.warn("Could not load profiles", e);
    }
}

function bannerAllowed(url: string) {
    try {
        const { protocol, hostname } = new URL(url);
        return protocol === "https:" && (BANNER_HOSTS.includes(hostname) || hostname === new URL(SHUTCORD_API).hostname);
    } catch {
        return false;
    }
}

// [primary, accent] as numbers, the format Discord's profile theme code expects
export function getShutcordColors(userId?: string): [number, number] | null {
    const p = userId ? profiles[userId] : undefined;
    if (!p?.color || !HEX.test(p.color)) return null;
    const primary = parseInt(p.color.slice(1), 16);
    const accent = p.accent && HEX.test(p.accent) ? parseInt(p.accent.slice(1), 16) : primary;
    return [primary, accent];
}

export default definePlugin({
    name: "ShutcordProfiles",
    description: "Shows the profile colours and banners people set on your Shutcord server, only for Shutcord users",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    enabledByDefault: true,

    patches: [
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.bannerFor(arguments[0])||$&"
            }
        }
    ],

    bannerFor({ displayProfile }: any) {
        if (displayProfile?.banner) return;
        const banner = profiles[displayProfile?.userId]?.banner;
        return banner && bannerAllowed(banner) ? banner : undefined;
    },

    async start() {
        await refresh();
        timer = setInterval(refresh, REFRESH_MS);
    },

    stop() {
        clearInterval(timer);
        profiles = {};
    }
});
