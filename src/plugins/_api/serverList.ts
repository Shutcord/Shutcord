/*
 * Shutcord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ServerListAPI",
    authors: [Devs.kemo],
    description: "API required for plugins that modify the server list.",

    patches: [
        {
            // Exports Discord's guildless item for the shared server-list component.
            find: '="DOWNLOAD_APPS"',
            replacement: {
                match: /(?<=\i\.\i\(\i,\{)(?=\i:\(\)=>\i.{0,30000}?let (\i)=function\(\i\)\{let\{ref:)/,
                replace: "GuildlessServerListItemComponent:()=>$1,"
            }
        },
        {
            find: "#{intl::DISCODO_DISABLED}",
            replacement: {
                match: /(?<=#{intl::DISCODO_DISABLED}.+?return)(\(.{0,150}?tutorialId:"friends-list".+?}\))(?=}function)/,
                replace: "[$1].concat(Shutcord.Api.ServerList.renderAll(Shutcord.Api.ServerList.ServerListRenderPosition.Above))"
            }
        },
        {
            find: ".setGuildsTree(",
            replacement: [
                {
                    match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)\i\.map\(.{0,50}\.length\)/,
                    replace: "Shutcord.Api.ServerList.renderAll(Shutcord.Api.ServerList.ServerListRenderPosition.In).concat($&)"
                },
                {
                    match: /lastTargetNode.{0,25}\?null:\i,/,
                    replace: "$&...Shutcord.Api.ServerList.renderAll(Shutcord.Api.ServerList.ServerListRenderPosition.Below),"
                }
            ]
        }
    ]
});
