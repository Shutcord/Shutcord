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
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    pretty: {
        type: OptionType.BOOLEAN,
        description: "Re-indent the JSON so it is easy to read",
        default: true
    }
});

const listener: MessageSendListener = (_channelId, msg) => {
    const text = msg.content.trim();
    if (text.length < 3 || text.includes("```") || !/^[[{]/.test(text)) return;

    try {
        const parsed = JSON.parse(text);
        const body = settings.store.pretty ? JSON.stringify(parsed, null, 2) : text;
        msg.content = "```json\n" + body + "\n```";
    } catch {
        // not JSON, send as typed
    }
};

export default definePlugin({
    name: "ShutcordAutoJson",
    description: "Puts JSON you paste into a tidy code block",
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
