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
    words: {
        type: OptionType.STRING,
        description: "Words to star out, separated by commas",
        default: ""
    }
});

const listener: MessageSendListener = (_channelId, msg) => {
    const words = settings.store.words.split(",").map(w => w.trim()).filter(Boolean);
    if (!words.length) return;

    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
    msg.content = msg.content.replace(re, w => w[0] + "*".repeat(w.length - 1));
};

export default definePlugin({
    name: "ShutcordSelfCensor",
    description: "Stars out words you never want to send, like f***",
    tags: ["Chat", "Privacy"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        addMessagePreSendListener(listener);
    },

    stop() {
        removeMessagePreSendListener(listener);
    }
});
