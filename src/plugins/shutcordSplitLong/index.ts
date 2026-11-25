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

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    limit: {
        type: OptionType.SLIDER,
        description: "Longest message to send in one piece. 2000 is Discord's normal limit, 4000 is the Nitro limit",
        markers: [500, 1000, 1500, 2000, 4000],
        default: 2000,
        stickToMarkers: false
    }
});

const FENCE = "```";
const fences = (s: string) => s.split(FENCE).length - 1;

function splitMessage(content: string, limit: number) {
    const parts: string[] = [];
    let rest = content;
    let reopen = false;

    while (rest.length > limit) {
        const room = limit - (FENCE.length + 1) * 2;
        let cut = rest.lastIndexOf("\n", room);
        if (cut < room / 2) cut = rest.lastIndexOf(" ", room);
        if (cut < room / 2) cut = room;

        let part = rest.slice(0, cut).trimEnd();
        rest = rest.slice(cut).trimStart();

        if (reopen) part = `${FENCE}\n${part}`;
        reopen = fences(part) % 2 === 1;
        if (reopen) part += `\n${FENCE}`;
        parts.push(part);
    }

    parts.push(reopen ? `${FENCE}\n${rest}` : rest);
    return parts;
}

const listener: MessageSendListener = async (channelId, msg) => {
    const limit = settings.store.limit;
    if (msg.content.length <= limit) return;

    const parts = splitMessage(msg.content, limit);
    for (const part of parts.slice(0, -1))
        await sendMessage(channelId, { content: part });

    msg.content = parts.at(-1)!;
};

export default definePlugin({
    name: "ShutcordSplitLong",
    description: "Splits messages that are over the length limit into several messages instead of blocking them",
    tags: ["Chat", "Utility"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        addMessagePreSendListener(listener);
    },

    stop() {
        removeMessagePreSendListener(listener);
    }
});
