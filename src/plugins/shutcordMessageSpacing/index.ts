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
import { createSheet } from "@utils/sheet";
import definePlugin, { OptionType } from "@utils/types";

const sheet = createSheet("sc-messagespacing");

function apply() {
    const s = settings.store;
    sheet.set(`[class*="groupStart"] { margin-top: ${s.gap}px !important; }`);
}

const settings = definePluginSettings({
    gap: {
        type: OptionType.SLIDER,
        description: "Space above each new message group in pixels",
        markers: [0, 4, 8, 12, 16, 24],
        default: 8,
        stickToMarkers: false,
        onChange: apply
    }
});

export default definePlugin({
    name: "ShutcordMessageSpacing",
    description: "Tighter or airier gaps between message groups",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
