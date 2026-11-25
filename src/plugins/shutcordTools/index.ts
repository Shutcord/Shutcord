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

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const text = (name: string, description: string) => ({
    name,
    description,
    type: ApplicationCommandOptionType.STRING,
    required: true
});

export default definePlugin({
    name: "ShutcordTools",
    description: "Small slash commands: /dice, /choose, /coinflip, /mock and /clap",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "dice",
            description: "Roll dice, for example 2 dice with 20 sides",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "sides", description: "Sides per die (default 6)", type: ApplicationCommandOptionType.INTEGER, required: false },
                { name: "count", description: "How many dice (default 1, max 20)", type: ApplicationCommandOptionType.INTEGER, required: false }
            ],
            execute(args) {
                const sides = Math.min(Math.max(findOption<number>(args, "sides", 6), 2), 1000);
                const count = Math.min(Math.max(findOption<number>(args, "count", 1), 1), 20);
                const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
                const total = rolls.reduce((a, b) => a + b, 0);
                return { content: `🎲 ${count}d${sides}: ${rolls.join(", ")}${count > 1 ? ` (total ${total})` : ""}` };
            }
        },
        {
            name: "choose",
            description: "Pick one option at random from a comma separated list",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [text("options", "For example: pizza, sushi, tacos")],
            execute(args) {
                const options = findOption<string>(args, "options", "").split(",").map(s => s.trim()).filter(Boolean);
                if (options.length < 2) return { content: "I need at least two options separated by commas." };
                return { content: `🤔 ${options.join(" / ")}\n➜ **${pick(options)}**` };
            }
        },
        {
            name: "coinflip",
            description: "Flip a coin",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [],
            execute: () => ({ content: `🪙 ${pick(["Heads", "Tails"])}` })
        },
        {
            name: "mock",
            description: "aLtErNaTiNg cAsE",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [text("text", "What to mock")],
            execute(args) {
                let i = 0;
                const out = [...findOption<string>(args, "text", "")]
                    .map(c => /\p{L}/u.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c)
                    .join("");
                return { content: out };
            }
        },
        {
            name: "clap",
            description: "Put 👏 between 👏 every 👏 word",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [text("text", "What to clap")],
            execute: args => ({ content: findOption<string>(args, "text", "").trim().split(/\s+/).join(" 👏 ") + " 👏" })
        }
    ]
});
