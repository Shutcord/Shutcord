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
    name: "ShutcordPassword",
    description: "/password makes a strong random password that only you can see",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "password",
            description: "Generate a random password (only you see it)",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "length", description: "How long, 8 to 64 (default 20)", type: ApplicationCommandOptionType.INTEGER, required: false },
                { name: "symbols", description: "Include symbols (default yes)", type: ApplicationCommandOptionType.BOOLEAN, required: false }
            ],
            execute(args, ctx) {
                const length = Math.min(Math.max(findOption<number>(args, "length", 20), 8), 64);
                const symbols = findOption<boolean>(args, "symbols", true);
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + (symbols ? "!@#$%^&*-_=+?" : "");
                const rand = crypto.getRandomValues(new Uint32Array(length));
                const password = [...rand].map(n => chars[n % chars.length]).join("");
                sendBotMessage(ctx.channel.id, { content: `\`${password}\`` });
            }
        }
    ]
});
