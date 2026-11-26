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


const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim minim veniam quis nostrud exercitation ullamco laboris nisi aliquip commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur".split(" ");

export default definePlugin({
    name: "ShutcordLorem",
    description: "/lorem sends placeholder text",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "lorem",
            description: "Placeholder text",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "sentences", description: "How many sentences, 1 to 10 (default 3)", type: ApplicationCommandOptionType.INTEGER, required: false }
            ],
            execute(args, ctx) {
                const count = Math.min(Math.max(findOption<number>(args, "sentences", 3), 1), 10);
                const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
                const sentences = Array.from({ length: count }, () => {
                    const s = Array.from({ length: 6 + Math.floor(Math.random() * 7) }, pick).join(" ");
                    return s[0].toUpperCase() + s.slice(1) + ".";
                });
                return { content: sentences.join(" ") };
            }
        }
    ]
});
