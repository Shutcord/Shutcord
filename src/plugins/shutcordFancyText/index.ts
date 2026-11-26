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


// [first capital, first small letter] in the Unicode math alphabets
const STYLES: Record<string, [number, number]> = {
    bold: [0x1D400, 0x1D41A],
    italic: [0x1D434, 0x1D44E],
    script: [0x1D49C, 0x1D4B6],
    mono: [0x1D670, 0x1D68A],
    double: [0x1D538, 0x1D552]
};

export default definePlugin({
    name: "ShutcordFancyText",
    description: "/fancy writes text in bold, italic, script or monospace letters",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "fancy",
            description: "Fancy letters",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "style", description: "bold, italic, script, mono or double", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "text", description: "The text to use", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const style = findOption<string>(args, "style", "bold").toLowerCase().trim();
                const base = STYLES[style];
                if (!base) return void sendBotMessage(ctx.channel.id, { content: "Styles: bold, italic, script, mono, double." });

                const out = [...findOption<string>(args, "text", "")].map(c => {
                    if (c >= "A" && c <= "Z") return String.fromCodePoint(base[0] + c.charCodeAt(0) - 65);
                    if (c >= "a" && c <= "z") return String.fromCodePoint(base[1] + c.charCodeAt(0) - 97);
                    return c;
                }).join("");
                return { content: out };
            }
        }
    ]
});
