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
    name: "ShutcordPoll",
    description: "/poll posts a simple numbered poll, separate the options with |",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "poll",
            description: "Quick poll: question | option | option",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "poll", description: "For example: Pizza night? | Yes | No | Maybe", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const [question, ...options] = findOption<string>(args, "poll", "").split("|").map(s => s.trim()).filter(Boolean);
                if (!question || options.length < 2 || options.length > 9)
                    return void sendBotMessage(ctx.channel.id, { content: "Write a question and 2 to 9 options, separated by |" });

                const lines = options.map((o, i) => `${i + 1}\uFE0F\u20E3 ${o}`);
                return { content: `📊 **${question}**\n${lines.join("\n")}` };
            }
        }
    ]
});
