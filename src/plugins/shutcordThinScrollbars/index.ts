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

const sheet = createSheet("sc-thinscrollbars");

function apply() {
    const s = settings.store;
    sheet.set(s.width === 0
        ? "* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; }"
        : `*::-webkit-scrollbar { width: ${s.width}px !important; height: ${s.width}px !important; } *::-webkit-scrollbar-thumb { border-radius: 99px !important; border: 0 !important; }`);
}

const settings = definePluginSettings({
    width: {
        type: OptionType.SLIDER,
        description: "Scrollbar width in pixels (0 hides them)",
        markers: [0, 4, 6, 8, 10, 14],
        default: 6,
        stickToMarkers: false,
        onChange: apply
    }
});

export default definePlugin({
    name: "ShutcordThinScrollbars",
    description: "Slim scrollbars everywhere, or none at all",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
