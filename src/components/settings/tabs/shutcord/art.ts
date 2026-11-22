/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

// All Shutcord artwork lives here as inline SVG, so it needs no network access and no image hosting.
// Everything is one grey on purpose. To restyle the settings banners, change the colors below.

export const SHUTCORD_COLORS = {
    mark: "#d4d4d8",
    bannerFrom: "#1d1d21",
    bannerTo: "#131316",
    block: "#ffffff"
};

const toDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

const C = SHUTCORD_COLORS;

/** The "SC" pixel mark on a dark badge, shown on the right side of the banners */
export const LOGO_IMAGE = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -112 480 448" shape-rendering="crispEdges">
  <path fill="${C.mark}" d="M32 0h160v32h-160zM288 0h160v32h-160zM0 32h64v32h-64zM160 32h64v32h-64zM256 32h64v32h-64zM416 32h64v32h-64zM0 64h64v32h-64zM256 64h64v32h-64zM32 96h160v32h-160zM256 96h64v32h-64zM160 128h64v32h-64zM256 128h64v32h-64zM0 160h64v32h-64zM160 160h64v32h-64zM256 160h64v32h-64zM416 160h64v32h-64zM32 192h160v32h-160zM288 192h160v32h-160z"/>
</svg>`);

function banner(from: string, to: string) {
    // a few faint pixel blocks on the right, in the same grid as the logo
    const blocks = [
        [700, 40, 1], [732, 40, 2], [764, 72, 1], [828, 40, 3], [796, 104, 2],
        [732, 136, 1], [860, 136, 2], [764, 200, 3], [828, 232, 1], [700, 232, 2]
    ].map(([x, y, o]) => `<rect x="${x}" y="${y}" width="32" height="32" fill="${C.block}" opacity="${(o * 0.025).toFixed(3)}"/>`).join("");

    return toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="900" height="300" fill="url(#g)"/>
  ${blocks}
</svg>`);
}

export const BANNER_DONATE = banner(C.bannerFrom, C.bannerTo);
export const BANNER_DONOR = banner("#232328", C.bannerTo);
export const BANNER_CONTRIB = banner("#1a1a1d", C.bannerTo);
