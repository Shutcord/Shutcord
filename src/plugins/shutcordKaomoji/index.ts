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
    name: "ShutcordKaomoji",
    description: "/shrug, /tableflip, /unflip and /lenny, with optional text in front",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "shrug",
            description: "Shrug",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "Text to put in front", type: ApplicationCommandOptionType.STRING, required: false }
            ],
            execute(args, ctx) {
                const text = findOption<string>(args, "text", "");
                return { content: `${text ? text + " " : ""}¯${"\\".repeat(3)}_(ツ)_/¯` };
            }
        },
        {
            name: "tableflip",
            description: "Flip the table",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "Text to put in front", type: ApplicationCommandOptionType.STRING, required: false }
            ],
            execute(args, ctx) {
                const text = findOption<string>(args, "text", "");
                return { content: `${text ? text + " " : ""}(╯°□°)╯︵ ┻━┻` };
            }
        },
        {
            name: "unflip",
            description: "Put the table back",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "Text to put in front", type: ApplicationCommandOptionType.STRING, required: false }
            ],
            execute(args, ctx) {
                const text = findOption<string>(args, "text", "");
                return { content: `${text ? text + " " : ""}┬─┬ノ( º _ ºノ)` };
            }
        },
        {
            name: "lenny",
            description: "Lenny face",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "Text to put in front", type: ApplicationCommandOptionType.STRING, required: false }
            ],
            execute(args, ctx) {
                const text = findOption<string>(args, "text", "");
                return { content: `${text ? text + " " : ""}( ͡° ͜ʖ ͡°)` };
            }
        }
    ]
});
