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

import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin from "@utils/types";

function onKey(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.code !== "KeyQ") return;

    const text = window.getSelection()?.toString().trim();
    if (!text) return;

    e.preventDefault();
    copyWithToast(text.split("\n").map(line => `> ${line}`).join("\n"), "Copied as a quote!");
}

export default definePlugin({
    name: "ShutcordQuoteHotkey",
    description: "Select some text and press Ctrl+Shift+Q to copy it as a quote, ready to paste",
    tags: ["Chat", "Shortcuts"],
    authors: [Devs.Shutcord],

    start() {
        document.addEventListener("keydown", onKey);
    },

    stop() {
        document.removeEventListener("keydown", onKey);
    }
});
