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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { RelationshipStore, SelectedChannelStore } from "@webpack/common";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    channelId: string;
    message: Message;
}

const settings = definePluginSettings({
    regex: {
        type: OptionType.STRING,
        description: "Regex to trigger on",
        default: "hop on (?:fortnite|fn)"
    },
    url: {
        type: OptionType.STRING,
        description: "URL to open",
        default: "com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true"
    }
});
export default definePlugin({
    name: "HopOn",
    origin: "equicord",
    description: "Hop on! Opens a configurable URL when a message matches a custom regex in the current channel.",
    tags: ["Fun"],
    authors: [Devs.ImLvna],
    settings,
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (RelationshipStore.isBlocked(message.author?.id)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;
            if (!message.content?.match(new RegExp(settings.store.regex, "i"))) return;

            ShutcordNative.native.openExternal(settings.store.url);
        }
    }
});
