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
    name: "ShutcordSnowflake",
    description: "/snowflake shows when a Discord ID was created (only you see it)",
    tags: ["Commands", "Developers"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "snowflake",
            description: "Find out when an ID was created",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "id", description: "A user, server, channel or message ID", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const raw = findOption<string>(args, "id", "").trim();
                if (!/^\d{15,21}$/.test(raw)) return void sendBotMessage(ctx.channel.id, { content: "That does not look like a Discord ID." });

                const seconds = Math.floor(Number((BigInt(raw) >> 22n) + 1420070400000n) / 1000);
                sendBotMessage(ctx.channel.id, { content: `Created <t:${seconds}:F> (<t:${seconds}:R>)` });
            }
        }
    ]
});
