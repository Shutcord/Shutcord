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

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts } from "@webpack/common";

const settings = definePluginSettings({
    everyone: {
        type: OptionType.BOOLEAN,
        description: "Ask before sending a message that pings @everyone or @here",
        default: true
    },
    longMessages: {
        type: OptionType.BOOLEAN,
        description: "Ask before sending a message with more than 15 lines",
        default: false
    }
});

const stripCode = (s: string) => s.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

const listener: MessageSendListener = async (_channelId, msg) => {
    const content = stripCode(msg.content);

    let reason: string | null = null;
    if (settings.store.everyone && /(^|\s)@(everyone|here)\b/.test(content))
        reason = "This message mentions @everyone or @here and can notify a lot of people.";
    else if (settings.store.longMessages && msg.content.split("\n").length > 15)
        reason = "This message is longer than 15 lines.";

    if (!reason) return;

    const ok = await Alerts.confirm({
        title: "Send this message?",
        body: reason,
        confirmText: "Send",
        cancelText: "Cancel"
    });

    return ok ? undefined : { cancel: true };
};

export default definePlugin({
    name: "ShutcordPingGuard",
    description: "Asks for confirmation before you send a message that mentions @everyone or @here",
    tags: ["Chat", "Utility"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        addMessagePreSendListener(listener);
    },

    stop() {
        removeMessagePreSendListener(listener);
    }
});
