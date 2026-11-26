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

// Ported from Equicord (GPL-3.0). Original authors are listed in `authors`.

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings(
    {
        blockedWords: {
            type: OptionType.STRING,
            description: "Strings not to capitilise (seperate with a comma)",
            default: "http, https, ok"
        }
    }
);

const presendObject: MessageSendListener = (_, msg) => {
    const blockedWordsArray: string[] = settings.store.blockedWords.split(", ");
    const sentences = msg.content.split(/(?<=[.!?]+['")\]]*)(\s+)/);

    msg.content = sentences.map((element, i) => {
        if (i % 2 === 1) return element;

        if (!blockedWordsArray.some(word => element.toLowerCase().startsWith(word.toLocaleLowerCase()))) {
            return element.charAt(0).toUpperCase() + element.slice(1);
        } else {
            return element;
        }
    }).join("");
};

export default definePlugin({
    name: "WriteUpperCase",
    origin: "equicord",
    description: "Changes the first Letter of each Sentence in Message Inputs to Uppercase",
    tags: ["Appearance", "Customisation", "Chat"],
    authors: [Devs.Samwich, Devs.PortKrystalskullofficial],
    settings,

    start() {
        addMessagePreSendListener(presendObject);
    },
    stop() {
        removeMessagePreSendListener(presendObject);
    }
});
