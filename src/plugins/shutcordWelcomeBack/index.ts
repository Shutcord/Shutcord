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
import { showToast } from "@webpack/common";

let leftAt = 0;

const settings = definePluginSettings({
    minutes: {
        type: OptionType.SLIDER,
        description: "Minutes away before the greeting shows up",
        markers: [5, 15, 30, 60, 120],
        default: 30,
        stickToMarkers: false
    }
});

function onBlur() {
    leftAt = Date.now();
}

function onFocus() {
    if (!leftAt) return;
    const away = Math.round((Date.now() - leftAt) / 60000);
    leftAt = 0;
    if (away >= settings.store.minutes) showToast({ text: `Welcome back, you were away for ${away} minutes` });
}

export default definePlugin({
    name: "ShutcordWelcomeBack",
    description: "Shows a small greeting when you return to Discord after being away for a while",
    tags: ["Utility", "Fun"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
    },

    stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    }
});
