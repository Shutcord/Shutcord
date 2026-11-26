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
let startedAt = 0;

function draw() {
    if (!pill) return;
    const mins = Math.floor((Date.now() - startedAt) / 60000);
    pill.textContent = mins < 60 ? `${mins}m in Discord` : `${Math.floor(mins / 60)}h ${mins % 60}m in Discord`;
}

const settings = definePluginSettings({
    corner: {
        type: OptionType.SELECT,
        description: "Where the timer sits",
        options: [
            { label: "Bottom left", value: "bottom-left", default: true },
            { label: "Bottom right", value: "bottom-right" },
            { label: "Top right", value: "top-right" },
            { label: "Top left", value: "top-left" }
        ],
        onChange: (c: Corner) => pill && placePill(pill, c)
    }
});

export default definePlugin({
    name: "ShutcordSessionTimer",
    description: "Shows how long you have had Discord open this session",
    tags: ["Utility", "Fun"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        startedAt = Date.now();
        pill = createPill("sc-session-timer", settings.store.corner);
        draw();
        timer = setInterval(draw, 15000);
    },

    stop() {
        clearInterval(timer);
        pill?.remove();
        pill = undefined;
    }
});
