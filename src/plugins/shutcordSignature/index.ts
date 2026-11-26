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
    text: {
        type: OptionType.STRING,
        description: "The line to add",
        default: ""
    },
    minLength: {
        type: OptionType.NUMBER,
        description: "Only add it to messages at least this many characters long",
        default: 0
    }
});

const listener: MessageSendListener = (_channelId, msg) => {
    const sig = settings.store.text.trim();
    if (!sig || !msg.content.trim()) return;
    if (settings.store.minLength > msg.content.length) return;

    msg.content = `${msg.content}\n${sig}`;
};

export default definePlugin({
    name: "ShutcordSignature",
    description: "Adds a line of your choice to the end of every message you send",
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
