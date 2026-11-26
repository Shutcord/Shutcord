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
    name: "ShutcordRps",
    description: "/rps plays rock paper scissors against Shutcord",
    tags: ["Commands", "Fun"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "rps",
            description: "Rock paper scissors",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "pick", description: "rock, paper or scissors", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const names = ["rock", "paper", "scissors"];
                const icons = ["🪨", "📄", "✂️"];
                const me = names.indexOf(findOption<string>(args, "pick", "").toLowerCase().trim());
                if (me === -1) return void sendBotMessage(ctx.channel.id, { content: "Pick rock, paper or scissors." });

                const bot = Math.floor(Math.random() * 3);
                const result = me === bot ? "Draw" : (me - bot + 3) % 3 === 1 ? "You win" : "You lose";
                return { content: `${icons[me]} vs ${icons[bot]}: **${result}**` };
            }
        }
    ]
});
