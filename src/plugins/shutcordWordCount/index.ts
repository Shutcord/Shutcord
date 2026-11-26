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
    name: "ShutcordWordCount",
    description: "/wordcount counts the words and letters in a text, only you see the result",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "wordcount",
            description: "Count words and letters",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "text", description: "The text to use", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const text = findOption<string>(args, "text", "");
                const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                sendBotMessage(ctx.channel.id, { content: `${words} words, ${text.length} characters, ${text.replace(/\s/g, "").length} without spaces` });
            }
        }
    ]
});
