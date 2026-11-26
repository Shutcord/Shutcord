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

const settings = definePluginSettings({
    corner: {
        type: OptionType.SELECT,
        description: "Where the clock sits",
        options: [
            { label: "Bottom right", value: "bottom-right", default: true },
            { label: "Bottom left", value: "bottom-left" },
            { label: "Top right", value: "top-right" },
            { label: "Top left", value: "top-left" }
        ],
        onChange: (c: Corner) => pill && placePill(pill, c)
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
        pill = createPill("sc-clock", settings.store.corner);
        draw();
        timer = setInterval(draw, 1000);
    },

    stop() {
        clearInterval(timer);
        pill?.remove();
        pill = undefined;
    }
});
