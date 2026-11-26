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

const sheet = createSheet("sc-chatfont");

function apply() {
    const s = settings.store;
    const font = s.font.replace(/[^\w\s-]/g, "").trim();
    sheet.set(`[class*="markup_"], [class*="messageContent"] { font-size: ${s.size}px !important; ${font ? `font-family: "${font}", sans-serif !important;` : ""} }`);
}

const settings = definePluginSettings({
    font: {
        type: OptionType.STRING,
        description: "Font name, for example Georgia or Inter. Leave empty for Discord's font",
        default: "",
        onChange: apply
    },
    size: {
        type: OptionType.SLIDER,
        description: "Message text size in pixels",
        markers: [12, 14, 16, 18, 20, 24],
        default: 16,
        stickToMarkers: false,
        onChange: apply
    }
});

export default definePlugin({
    name: "ShutcordChatFont",
    description: "Use your own font and text size for messages",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
