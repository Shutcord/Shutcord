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

import { Devs } from "@utils/constants";
import { createSheet } from "@utils/sheet";
import definePlugin from "@utils/types";

const sheet = createSheet("sc-reducemotion");

const CSS = `*, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
}`;

export default definePlugin({
    name: "ShutcordReduceMotion",
    description: "Turns off nearly all animations and transitions",
    tags: ["Accessibility", "Appearance"],
    authors: [Devs.Shutcord],

    start() {
        sheet.set(CSS);
    },

    stop() {
        sheet.clear();
    }
});
