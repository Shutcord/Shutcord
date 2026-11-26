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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ShutcordCountdown",
    description: "/countdown posts a live countdown that everyone sees in their own time zone",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "countdown",
            description: "Post a live countdown",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "minutes", description: "Minutes from now", type: ApplicationCommandOptionType.INTEGER, required: true },
                { name: "label", description: "What it is for", type: ApplicationCommandOptionType.STRING, required: false }
            ],
            execute(args, ctx) {
                const minutes = Math.min(Math.max(findOption<number>(args, "minutes", 5), 1), 60 * 24 * 30);
                const label = findOption<string>(args, "label", "");
                const at = Math.floor(Date.now() / 1000) + minutes * 60;
                return { content: `${label ? label + ": " : "⏳ "}<t:${at}:R> (<t:${at}:t>)` };
            }
        }
    ]
});
