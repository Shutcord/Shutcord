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


const ANSWERS = [
    "It is certain", "Without a doubt", "Yes, definitely", "Most likely", "Signs point to yes",
    "Ask again later", "Cannot predict now", "Better not tell you now",
    "Don't count on it", "My sources say no", "Very doubtful", "Outlook not so good"
];

export default definePlugin({
    name: "ShutcordEightBall",
    description: "/8ball answers a yes or no question",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "8ball",
            description: "Ask the magic 8 ball",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "question", description: "Your question", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const question = findOption<string>(args, "question", "");
                return { content: `🎱 ${question}\n**${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}**` };
            }
        }
    ]
});
