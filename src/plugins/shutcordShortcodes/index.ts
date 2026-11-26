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

const CODES: Record<string, string> = {
    arrow: "→", larrow: "←", uarrow: "↑", darrow: "↓", check: "✔", cross: "✘", star: "★", dot: "•",
    ellipsis: "…", dash: "—", deg: "°", tm: "™", copy: "©", reg: "®", infinity: "∞", approx: "≈",
    neq: "≠", times: "×", divide: "÷", plusminus: "±", half: "½", pi: "π", micro: "µ", euro: "€"
};

const listener: MessageSendListener = (_channelId, msg) => {
    msg.content = msg.content.replace(/:([a-z]+):/g, (all, name: string) => CODES[name] ?? all);
};

export default definePlugin({
    name: "ShutcordShortcodes",
    description: "Type :arrow:, :check:, :dash:, :deg: and more to get the symbol",
    tags: ["Chat", "Utility"],
    authors: [Devs.Shutcord],

    start() {
        addMessagePreSendListener(listener);
    },

    stop() {
        removeMessagePreSendListener(listener);
    }
});
