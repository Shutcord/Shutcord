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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const listener: MessageSendListener = (_channelId, msg) => {
    if (msg.content.includes("```")) return;
    msg.content = msg.content.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/gm, "").trim();
};

export default definePlugin({
    name: "ShutcordCleanSpaces",
    description: "Removes double spaces and spaces at the end of lines before sending",
    tags: ["Chat", "Utility"],
    authors: [Devs.Shutcord],

    start() {
        addMessagePreSendListener(listener);
    },

    stop() {
        removeMessagePreSendListener(listener);
    }
});
