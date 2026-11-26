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

const sheet = createSheet("sc-imagelimit");

function apply() {
    const s = settings.store;
    sheet.set(`[class*="imageWrapper"], [class*="imageWrapper"] img, [class*="mediaAttachmentsContainer"] img, [class*="mediaAttachmentsContainer"] video { max-height: ${s.height}px !important; width: auto; object-fit: contain; }`);
}

const settings = definePluginSettings({
    height: {
        type: OptionType.SLIDER,
        description: "Tallest an image or video may be in chat, in pixels",
        markers: [150, 250, 350, 450, 600],
        default: 350,
        stickToMarkers: false,
        onChange: apply
    }
});

export default definePlugin({
    name: "ShutcordImageLimit",
    description: "Keeps huge images from taking over the chat",
    tags: ["Appearance", "Utility"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
