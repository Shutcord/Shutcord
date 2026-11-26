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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ShutcordUuid",
    description: "/uuid makes a random UUID that only you can see",
    tags: ["Commands", "Developers"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "uuid",
            description: "Generate a random UUID (only you see it)",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [

            ],
            execute(args, ctx) {
                sendBotMessage(ctx.channel.id, { content: `\`${crypto.randomUUID()}\`` });
            }
        }
    ]
});
