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
    name: "ShutcordBinary",
    description: "/binary writes text as 8-bit binary, /unbinary reads it back (only you see that)",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "binary",
            description: "Text to binary",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "The text to use", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const bytes = new TextEncoder().encode(findOption<string>(args, "text", ""));
                return { content: [...bytes].map(b => b.toString(2).padStart(8, "0")).join(" ") };
            }
        },
        {
            name: "unbinary",
            description: "Binary to text, shown only to you",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "bits", description: "Binary like 01001000 01101001", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const groups = findOption<string>(args, "bits", "").match(/[01]{8}/g) ?? [];
                const text = new TextDecoder().decode(Uint8Array.from(groups.map(g => parseInt(g, 2))));
                sendBotMessage(ctx.channel.id, { content: text || "I could not read that as binary." });
            }
        }
    ]
});
