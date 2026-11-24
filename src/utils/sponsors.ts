/*
 * Shutcord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SponsorTier {
    /** Display name, e.g. "Patron" */
    name: string;
    /** Monthly price in USD, informational only */
    usd: number;
    /** How many profile badges this tier may show */
    badges: number;
}

export interface SponsorBadge {
    tooltip?: string;
    /** Image URL, must be hosted on raw.githubusercontent.com or cdn.discordapp.com */
    badge: string;
    /** Set to 1 if a "@2x" version of the image sits next to it */
    "2"?: 1;
}

export interface Sponsor {
    tier: string;
    /** GitHub username, only used for the avatar list in the README */
    github?: string;
    badges?: SponsorBadge[];
}

export interface SponsorsFile {
    tiers: Record<string, SponsorTier>;
    sponsors: Record<string, Sponsor>;
}

export const ALLOWED_BADGE_HOSTS = ["raw.githubusercontent.com", "cdn.discordapp.com"];

export function isAllowedBadgeUrl(url: string) {
    try {
        const u = new URL(url);
        return u.protocol === "https:" && ALLOWED_BADGE_HOSTS.includes(u.hostname);
    } catch {
        return false;
    }
}

/** Turns sponsors.json into `userId -> badges`, cutting every sponsor down to what their tier allows */
export function resolveSponsorBadges(data: Partial<SponsorsFile> | null | undefined) {
    const result: Record<string, SponsorBadge[]> = {};
    if (!data?.tiers || !data.sponsors) return result;

    for (const [userId, sponsor] of Object.entries(data.sponsors)) {
        const limit = data.tiers[sponsor?.tier]?.badges ?? 0;
        const badges = (sponsor?.badges ?? [])
            .filter(b => b && typeof b.badge === "string" && isAllowedBadgeUrl(b.badge))
            .slice(0, limit);

        if (badges.length) result[userId] = badges;
    }

    return result;
}

/** Everyone listed in sponsors.json with a valid tier counts as a donor, even without badges ($1 tier) */
export function listSponsorIds(data: Partial<SponsorsFile> | null | undefined) {
    if (!data?.tiers || !data.sponsors) return new Set<string>();
    return new Set(Object.entries(data.sponsors).filter(([, s]) => s && data.tiers![s.tier]).map(([id]) => id));
}
