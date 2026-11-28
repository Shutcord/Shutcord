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
import { Corner, createPill, placePill } from "@utils/sheet";
import definePlugin, { OptionType } from "@utils/types";

let pill: HTMLElement | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

function draw() {
    if (!pill) return;
    const { hour24, seconds } = settings.store;
    pill.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: !hour24
    });
}

/** Position, size and the title bar takeover all live here so a setting change just calls it again */
function layout() {
    if (!pill) return;
    const { corner, size, coverTitle } = settings.store;
    placePill(pill, corner as Corner);

    const px = Math.round(size);
    pill.style.fontSize = `${px}px`;
    pill.style.padding = `${Math.round(px * 0.4)}px ${Math.round(px * 0.85)}px`;

    // the top center spot is where Discord writes the page name (the "Friends" text), so the clock takes its place
    if (corner === "top-center" && coverTitle) {
        pill.style.top = "0";
        pill.style.borderRadius = "0 0 12px 12px";
        pill.style.minWidth = "260px";
        pill.style.textAlign = "center";
        pill.style.background = "var(--sc-bg-0, #0d0d0f)";
        pill.style.border = "0";
        pill.style.zIndex = "99999";
    } else {
        pill.style.borderRadius = "999px";
        pill.style.minWidth = "";
        pill.style.textAlign = "";
        pill.style.background = "rgba(24, 24, 27, .85)";
        pill.style.border = "1px solid rgba(255, 255, 255, .1)";
        pill.style.zIndex = "9990";
    }
}

const settings = definePluginSettings({
    corner: {
        type: OptionType.SELECT,
        description: "Where the clock sits",
        options: [
            { label: "Bottom right", value: "bottom-right", default: true },
            { label: "Bottom center", value: "bottom-center" },
            { label: "Bottom left", value: "bottom-left" },
            { label: "Top right", value: "top-right" },
            { label: "Top center", value: "top-center" },
            { label: "Top left", value: "top-left" }
        ],
        onChange: layout
    },
    size: {
        type: OptionType.SLIDER,
        description: "Size of the clock",
        markers: [10, 12, 14, 18, 22, 28, 36],
        default: 12,
        stickToMarkers: false,
        onChange: layout
    },
    coverTitle: {
        type: OptionType.BOOLEAN,
        description: "At top center, replace the page name in the title bar (the Friends text) instead of floating over it",
        default: true,
        onChange: layout
    },
    hour24: { type: OptionType.BOOLEAN, description: "Use the 24 hour clock", default: true, onChange: draw },
    seconds: { type: OptionType.BOOLEAN, description: "Show seconds", default: false, onChange: draw }
});

export default definePlugin({
    name: "ShutcordClock",
    description: "A small clock floating in a corner of the window",
    tags: ["Utility", "Appearance"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        pill = createPill("sc-clock", settings.store.corner as Corner);
        layout();
        draw();
        timer = setInterval(draw, 1000);
    },

    stop() {
        clearInterval(timer);
        pill?.remove();
        pill = undefined;
    }
});
