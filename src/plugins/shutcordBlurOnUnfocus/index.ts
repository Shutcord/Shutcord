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

const sheet = createSheet("sc-blur-unfocus");
let timer: ReturnType<typeof setTimeout> | undefined;

const settings = definePluginSettings({
    delay: {
        type: OptionType.SLIDER,
        description: "Seconds after you leave the window before the chat is blurred",
        markers: [0, 2, 5, 10, 30],
        default: 2,
        stickToMarkers: false
    },
    amount: {
        type: OptionType.SLIDER,
        description: "How strong the blur is",
        markers: [4, 8, 12, 20],
        default: 12,
        stickToMarkers: false
    }
});

function onBlur() {
    clearTimeout(timer);
    timer = setTimeout(() => {
        sheet.set(`[class*="chatContent"], [class*="sidebarList"], [class*="membersWrap"] { filter: blur(${settings.store.amount}px); transition: filter .2s; }`);
    }, settings.store.delay * 1000);
}

function onFocus() {
    clearTimeout(timer);
    sheet.clear();
}

export default definePlugin({
    name: "ShutcordBlurOnUnfocus",
    description: "Blurs the chat while Discord is not the active window, so nobody can read it over your shoulder",
    tags: ["Privacy", "Appearance"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
    },

    stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        onFocus();
    }
});
