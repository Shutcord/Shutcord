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
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, ChannelStore, UserGuildSettingsStore } from "@webpack/common";

const settings = definePluginSettings({
    onlyWhenUnfocused: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Only automatically jump to messages when Discord's window is unfocused.",
    },
});

export default definePlugin({
    name: "AutoJumpToMessage",
    origin: "equicord",
    description: "Automatically opens the channel from new messages.",
    tags: ["Chat", "Utility"],
    authors: [{ name: "k304", id: 255004979637649408n }],
    settings,
    flux: {
        RPC_NOTIFICATION_CREATE({ channelId }) {
            if (!channelId || settings.store.onlyWhenUnfocused && document.hasFocus()
                || UserGuildSettingsStore.isGuildOrCategoryOrChannelMuted(ChannelStore.getChannel(channelId)?.guild_id, channelId)) return;
            ChannelRouter.transitionToChannel(channelId);
        }
    },
});
