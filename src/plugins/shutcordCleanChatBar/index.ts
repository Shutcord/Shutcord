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

const sheet = createSheet("sc-cleanchatbar");

function apply() {
    const s = settings.store;
    const hide: string[] = [];
    if (s.gift) hide.push('[aria-label="Send a gift"]');
    if (s.stickers) hide.push('[aria-label="Open sticker picker"]');
    if (s.gifs) hide.push('[aria-label="Open GIF picker"]');
    if (s.emoji) hide.push('[aria-label="Select emoji"]');
    if (s.apps) hide.push('[aria-label="Apps"]');
    sheet.set(hide.length ? `${hide.join(", ")} { display: none !important; }` : "");
}

const settings = definePluginSettings({
    gift: { type: OptionType.BOOLEAN, description: "Hide the gift button", default: true, onChange: apply },
    stickers: { type: OptionType.BOOLEAN, description: "Hide the sticker button", default: false, onChange: apply },
    gifs: { type: OptionType.BOOLEAN, description: "Hide the GIF button", default: false, onChange: apply },
    emoji: { type: OptionType.BOOLEAN, description: "Hide the emoji button", default: false, onChange: apply },
    apps: { type: OptionType.BOOLEAN, description: "Hide the apps button", default: true, onChange: apply }
});

export default definePlugin({
    name: "ShutcordCleanChatBar",
    description: "Choose which buttons stay in the message box",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    settings,

    start: apply,

    stop() {
        sheet.clear();
    }
});
