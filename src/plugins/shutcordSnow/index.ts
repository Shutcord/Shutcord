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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

interface Flake { x: number; y: number; r: number; v: number; drift: number; }

const settings = definePluginSettings({
    amount: {
        type: OptionType.SLIDER,
        description: "How many flakes",
        markers: [30, 60, 120, 200, 300],
        default: 80,
        stickToMarkers: false
    },
    speed: {
        type: OptionType.SLIDER,
        description: "How fast they fall",
        markers: [0.5, 1, 1.5, 2, 3],
        default: 1,
        stickToMarkers: false
    }
});

let canvas: HTMLCanvasElement | undefined;
let frame = 0;
let flakes: Flake[] = [];

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function makeFlake(randomY: boolean): Flake {
    return {
        x: Math.random() * window.innerWidth,
        y: randomY ? Math.random() * window.innerHeight : -10,
        r: 1 + Math.random() * 2.5,
        v: 0.4 + Math.random() * 1.2,
        drift: Math.random() * Math.PI * 2
    };
}

function tick() {
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    while (flakes.length < settings.store.amount) flakes.push(makeFlake(true));
    flakes.length = Math.min(flakes.length, settings.store.amount);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, .8)";
    for (const f of flakes) {
        f.y += f.v * settings.store.speed;
        f.drift += 0.01;
        f.x += Math.sin(f.drift) * 0.4;
        if (f.y > canvas.height + 10) Object.assign(f, makeFlake(false));
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
    }
    frame = requestAnimationFrame(tick);
}

export default definePlugin({
    name: "ShutcordSnow",
    description: "A gentle snowfall over the whole window. It never blocks clicks",
    tags: ["Fun", "Appearance"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        canvas = document.createElement("canvas");
        Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "9980", pointerEvents: "none" });
        document.body.append(canvas);
        resize();
        window.addEventListener("resize", resize);
        flakes = [];
        frame = requestAnimationFrame(tick);
    },

    stop() {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        canvas?.remove();
        canvas = undefined;
        flakes = [];
    }
});
