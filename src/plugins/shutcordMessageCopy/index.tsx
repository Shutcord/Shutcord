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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CopyIcon, CopyIdIcon, LinkIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";

const patch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message) return;

    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id ?? "@me";
    const link = `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
    const quote = message.content
        .split("\n")
        .map(line => `> ${line}`)
        .join("\n");

    children.push(
        <Menu.MenuGroup id="sc-message-copy" key="sc-message-copy">
            <Menu.MenuItem
                id="sc-copy-message-link"
                label="Copy Message Link"
                icon={LinkIcon}
                action={() => copyWithToast(link, "Message link copied!")}
            />
            <Menu.MenuItem
                id="sc-copy-message-id"
                label="Copy Message ID"
                icon={CopyIdIcon}
                action={() => copyWithToast(message.id, "Message ID copied!")}
            />
            {message.content && (
                <Menu.MenuItem
                    id="sc-copy-message-quote"
                    label="Copy as Quote"
                    icon={CopyIcon}
                    action={() => copyWithToast(`${quote}\n— ${message.author.globalName ?? message.author.username}`, "Quote copied!")}
                />
            )}
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "ShutcordMessageCopy",
    description: "Adds Copy Message Link, Copy Message ID and Copy as Quote to the message menu",
    tags: ["Chat", "Utility"],
    authors: [Devs.Shutcord],
    contextMenus: {
        "message": patch
    }
});
