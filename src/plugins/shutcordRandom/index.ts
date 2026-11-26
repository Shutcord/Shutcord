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
    name: "ShutcordRandom",
    description: "/random picks a number between two values",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "random",
            description: "Random number",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "min", description: "Lowest number", type: ApplicationCommandOptionType.INTEGER, required: false },
                { name: "max", description: "Highest number", type: ApplicationCommandOptionType.INTEGER, required: false }
            ],
            execute(args, ctx) {
                const a = findOption<number>(args, "min", 1);
                const b = findOption<number>(args, "max", 100);
                const lo = Math.min(a, b), hi = Math.max(a, b);
                return { content: `🎲 ${lo} to ${hi}: **${lo + Math.floor(Math.random() * (hi - lo + 1))}**` };
            }
        }
    ]
});
