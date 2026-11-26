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
    keepSolo: {
        type: OptionType.BOOLEAN,
        description: "Leave a message alone when it is only one link, so that link still gets its preview",
        default: true
    }
});

const listener: MessageSendListener = (_channelId, msg) => {
    const text = msg.content;
    if (text.includes("```")) return;
    if (settings.store.keepSolo && /^\s*https?:\/\/\S+\s*$/.test(text)) return;

    msg.content = text.replace(/(?<![<\w(])(https?:\/\/[^\s<>()]+)/g, "<$1>");
};

export default definePlugin({
    name: "ShutcordNoEmbed",
    description: "Wraps links in < > when you send them so Discord does not add a big preview",
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
