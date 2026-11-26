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
    name: "ShutcordRot13",
    description: "/rot13 scrambles text with the classic ROT13 cipher",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "rot13",
            description: "ROT13 text, run it twice to undo",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "The text to use", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const out = findOption<string>(args, "text", "").replace(/[a-z]/gi, c => {
                    const base = c <= "Z" ? 65 : 97;
                    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
                });
                return { content: out };
            }
        }
    ]
});
