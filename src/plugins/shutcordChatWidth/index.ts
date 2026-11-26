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

const sheet = createSheet("sc-chatwidth");

function apply() {
    const s = settings.store;
    sheet.set(`[class*="messageListItem"] [class*="contents"] { max-width: ${s.width}px; }`);
}

const settings = definePluginSettings({
    width: {
        type: OptionType.SLIDER,
        description: "Widest a message may be, in pixels",
        markers: [600, 720, 840, 960, 1200],
        default: 840,
        stickToMarkers: false,
        onChange: apply
    }
});

export default definePlugin({
    name: "ShutcordChatWidth",
    description: "Limit how wide messages can get, easier to read on big screens",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
