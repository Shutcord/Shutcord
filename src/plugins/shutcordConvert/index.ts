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


const TEMP: Record<string, true> = { c: true, f: true, k: true };

// [kind, size in the base unit of that kind]
const UNITS: Record<string, [string, number]> = {
    km: ["length", 1000], m: ["length", 1], cm: ["length", 0.01], mi: ["length", 1609.344], ft: ["length", 0.3048], in: ["length", 0.0254],
    kg: ["mass", 1000], g: ["mass", 1], lb: ["mass", 453.592], oz: ["mass", 28.3495]
};

export default definePlugin({
    name: "ShutcordConvert",
    description: "/convert changes units: km, mi, m, ft, kg, lb, c, f",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "convert",
            description: "Convert a value, for example 10 km mi",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "value", description: "The number", type: ApplicationCommandOptionType.NUMBER, required: true },
                { name: "from", description: "Unit to convert from", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "to", description: "Unit to convert to", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const value = findOption<number>(args, "value", 0);
                const from = findOption<string>(args, "from", "").toLowerCase();
                const to = findOption<string>(args, "to", "").toLowerCase();

                let result: number | null = null;
                if (from in TEMP && to in TEMP) {
                    const c = from === "c" ? value : from === "f" ? (value - 32) * 5 / 9 : value - 273.15;
                    result = to === "c" ? c : to === "f" ? c * 9 / 5 + 32 : c + 273.15;
                } else if (UNITS[from] && UNITS[to] && UNITS[from][0] === UNITS[to][0]) {
                    result = value * UNITS[from][1] / UNITS[to][1];
                }

                sendBotMessage(ctx.channel.id, {
                    content: result == null ? "I can only convert between units of the same kind: km mi m ft cm in kg lb g oz, or c f k." : `${value} ${from} = **${Math.round(result * 1000) / 1000} ${to}**`
                });
            }
        }
    ]
});
