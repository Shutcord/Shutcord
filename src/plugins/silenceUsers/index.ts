/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2026 Shutcord and contributors
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

// Ported from Equicord (GPL-3.0). Original authors are listed in `authors`.

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    mutedUserIds: {
        type: OptionType.STRING,
        description: "Comma-separated Discord user IDs to silence pings and server badges.",
        default: "",
        restartNeeded: false,
    },
});

function getMutedIds(): Set<string> {
    const { mutedUserIds } = settings.store;
    const ids = mutedUserIds.split(",").map(id => id.trim()).filter(Boolean);
    return new Set(ids);
}

function interceptor(event: any) {
    try {
        const mutedIds = getMutedIds();
        if (!mutedIds.size) return;

        if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
            const msg = event.message;
            if (!msg) return;

            const authorId = String(msg.author?.id ?? "");
            if (!authorId || !mutedIds.has(authorId)) return;

            msg.mention_everyone = false;
            msg.mention_roles = [];
            msg.mentions = [];
        }

        if (event.type === "NOTIFICATION_CREATE") {
            const msg = event?.message ?? event?.notification?.message;
            if (!msg) return;

            const authorId = String(msg?.author?.id ?? "");
            if (!authorId || !mutedIds.has(authorId)) return;

            return false;
        }
    } catch { }
}

export default definePlugin({
    name: "SilenceUsers",
    origin: "equicord",
    description: "Silences @mention pings and server badge counts from specific users. Regular messages and DMs are untouched.",
    authors: [{ name: "DKA", id: 119386840624005121n }],
    tags: ["Notifications"],
    settings,
    start() {
        FluxDispatcher.addInterceptor(interceptor);
    },
    stop() {
        const list = FluxDispatcher._interceptors ?? [];
        const idx = list.indexOf(interceptor);
        if (idx !== -1) list.splice(idx, 1);
    },
});
