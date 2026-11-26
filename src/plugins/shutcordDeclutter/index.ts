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

const sheet = createSheet("sc-declutter");

function apply() {
    const s = settings.store;
    const hide: string[] = [];
    if (s.embeds) hide.push('[class*="embedWrapper"]', '[class*="embedFull"]');
    if (s.reactions) hide.push('[class*="reactions_"]');
    if (s.stickers) hide.push('[class*="stickerAsset"]');
    sheet.set(hide.length ? `${hide.join(", ")} { display: none !important; }` : "");
}

const settings = definePluginSettings({
    embeds: { type: OptionType.BOOLEAN, description: "Hide link previews and embeds", default: false, onChange: apply },
    reactions: { type: OptionType.BOOLEAN, description: "Hide reactions under messages", default: false, onChange: apply },
    stickers: { type: OptionType.BOOLEAN, description: "Hide stickers in messages", default: false, onChange: apply }
});

export default definePlugin({
    name: "ShutcordDeclutter",
    description: "Hide link previews, reactions or stickers in chat",
    tags: ["Appearance", "Chat"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
