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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    text: {
        type: OptionType.STRING,
        description: "Text shown on the cover screen. Leave empty for a plain black screen",
        default: ""
    }
});

let cover: HTMLDivElement | undefined;

function show() {
    cover = document.createElement("div");
    Object.assign(cover.style, {
        position: "fixed", inset: "0", zIndex: "2147483647", background: "#000", color: "#52525b",
        display: "grid", placeItems: "center", font: "14px system-ui, sans-serif"
    });
    cover.textContent = settings.store.text;
    document.body.append(cover);
    document.querySelectorAll("video, audio").forEach(m => (m as HTMLMediaElement).pause());
}

function hide() {
    cover?.remove();
    cover = undefined;
}

function onKey(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.code !== "KeyH") return;
    e.preventDefault();
    if (cover) hide(); else show();
}

export default definePlugin({
    name: "ShutcordPanicKey",
    description: "Press Ctrl+Alt+H to cover the whole window with a black screen. Press it again to come back",
    tags: ["Privacy", "Shortcuts"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        document.addEventListener("keydown", onKey, true);
    },

    stop() {
        document.removeEventListener("keydown", onKey, true);
        hide();
    }
});
