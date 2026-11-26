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


function evaluate(input: string): number | null {
    const tokens = input.replace(/\s+/g, "").match(/\d+\.?\d*|[-+*/^()%]/g);
    if (!tokens || tokens.join("") !== input.replace(/\s+/g, "")) return null;

    let i = 0;
    const peek = () => tokens[i];

    function primary(): number {
        const t = tokens![i++];
        if (t === "(") {
            const v = sum();
            if (tokens![i++] !== ")") throw new Error("missing )");
            return v;
        }
        if (t === "-") return -primary();
        if (t === "+") return primary();
        const n = Number(t);
        if (Number.isNaN(n)) throw new Error("bad number");
        return n;
    }

    function power(): number {
        const base = primary();
        if (peek() === "^") { i++; return base ** power(); }
        return base;
    }

    function product(): number {
        let v = power();
        while (peek() === "*" || peek() === "/" || peek() === "%") {
            const op = tokens![i++];
            const r = power();
            v = op === "*" ? v * r : op === "/" ? v / r : v % r;
        }
        return v;
    }

    function sum(): number {
        let v = product();
        while (peek() === "+" || peek() === "-") {
            const op = tokens![i++];
            const r = product();
            v = op === "+" ? v + r : v - r;
        }
        return v;
    }

    try {
        const v = sum();
        return i === tokens.length && Number.isFinite(v) ? Math.round(v * 1e10) / 1e10 : null;
    } catch {
        return null;
    }
}

export default definePlugin({
    name: "ShutcordCalc",
    description: "/calc solves a maths expression, only you see the result",
    tags: ["Commands", "Utility"],
    authors: [Devs.Shutcord],

    commands: [
        {
            name: "calc",
            description: "Calculate, for example (2+3)*4^2",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "expression", description: "The expression", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const result = evaluate(findOption<string>(args, "expression", ""));
                sendBotMessage(ctx.channel.id, { content: result == null ? "I could not read that expression." : `= **${result}**` });
            }
        }
    ]
});
