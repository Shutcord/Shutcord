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
    name: "ShutcordBase64",
    description: "/b64 encodes text to Base64, /unb64 decodes it (only you see that)",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "b64",
            description: "Text to Base64",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "The text to use", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const bytes = new TextEncoder().encode(findOption<string>(args, "text", ""));
                return { content: btoa(String.fromCharCode(...bytes)) };
            }
        },
        {
            name: "unb64",
            description: "Base64 to text, shown only to you",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "data", description: "The Base64 text", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                try {
                    const bin = atob(findOption<string>(args, "data", "").trim());
                    sendBotMessage(ctx.channel.id, { content: new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))) });
                } catch {
                    sendBotMessage(ctx.channel.id, { content: "That is not valid Base64." });
                }
            }
        }
    ]
});
