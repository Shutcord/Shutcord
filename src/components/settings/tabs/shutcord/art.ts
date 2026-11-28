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

/** The "SC" mark, shown on the right side of the banners */
export const LOGO_IMAGE = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 610 512"><g transform="translate(-10 55)"><defs><mask id="m" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="800"><rect x="-100" y="-100" width="900" height="800" fill="#fff"/><g transform="translate(428 262) rotate(-6) scale(0.46 -0.46) translate(-389 -344)"><path d="M733 405H522Q522 465 490.5 500.0Q459 535 401 535Q334 535 302.5 493.0Q271 451 271 376V312Q271 238 302.5 195.5Q334 153 399 153Q463 153 496.0 186.0Q529 219 529 279H733Q733 138 646.5 63.0Q560 -12 402 -12Q226 -12 135.5 78.0Q45 168 45 344Q45 520 135.5 610.0Q226 700 402 700Q555 700 644.0 623.5Q733 547 733 405Z" stroke-linejoin="round" stroke-width="56" fill="#000" stroke="#000"/></g></mask></defs><g mask="url(#m)"><g transform="translate(190 140) rotate(-6) scale(0.46 -0.46) translate(-364.5 -344)"><path d="M667 488V476H460V480Q460 510 438.0 530.0Q416 550 371 550Q327 550 303.5 537.0Q280 524 280 505Q280 478 312.0 465.0Q344 452 415 438Q498 421 551.5 402.5Q605 384 645.0 342.0Q685 300 686 228Q686 106 603.5 47.0Q521 -12 383 -12Q222 -12 132.5 42.0Q43 96 43 233H252Q252 181 279.0 163.5Q306 146 363 146Q405 146 432.5 155.0Q460 164 460 192Q460 217 429.5 229.5Q399 242 330 256Q246 274 191.0 293.5Q136 313 95.0 358.0Q54 403 54 480Q54 593 141.5 646.5Q229 700 363 700Q495 700 580.0 646.5Q665 593 667 488Z" stroke-linejoin="round" stroke-width="28" fill="#a1a1aa" stroke="#a1a1aa"/></g></g><g transform="translate(428 262) rotate(-6) scale(0.46 -0.46) translate(-389 -344)"><path d="M733 405H522Q522 465 490.5 500.0Q459 535 401 535Q334 535 302.5 493.0Q271 451 271 376V312Q271 238 302.5 195.5Q334 153 399 153Q463 153 496.0 186.0Q529 219 529 279H733Q733 138 646.5 63.0Q560 -12 402 -12Q226 -12 135.5 78.0Q45 168 45 344Q45 520 135.5 610.0Q226 700 402 700Q555 700 644.0 623.5Q733 547 733 405Z" stroke-linejoin="round" stroke-width="28" fill="#e4e4e7" stroke="#e4e4e7"/></g></g></svg>`);

function banner(from: string, to: string) {
    // one big, very faint copy of the mark on the right
    return toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="900" height="300" fill="url(#g)"/>
  <g transform="translate(730 150) scale(.45) translate(-305 -256)" opacity=".05"><g transform="translate(-10 55)"><defs><mask id="bm" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="800"><rect x="-100" y="-100" width="900" height="800" fill="#fff"/><g transform="translate(428 262) rotate(-6) scale(0.46 -0.46) translate(-389 -344)"><path d="M733 405H522Q522 465 490.5 500.0Q459 535 401 535Q334 535 302.5 493.0Q271 451 271 376V312Q271 238 302.5 195.5Q334 153 399 153Q463 153 496.0 186.0Q529 219 529 279H733Q733 138 646.5 63.0Q560 -12 402 -12Q226 -12 135.5 78.0Q45 168 45 344Q45 520 135.5 610.0Q226 700 402 700Q555 700 644.0 623.5Q733 547 733 405Z" stroke-linejoin="round" stroke-width="56" fill="#000" stroke="#000"/></g></mask></defs><g mask="url(#bm)"><g transform="translate(190 140) rotate(-6) scale(0.46 -0.46) translate(-364.5 -344)"><path d="M667 488V476H460V480Q460 510 438.0 530.0Q416 550 371 550Q327 550 303.5 537.0Q280 524 280 505Q280 478 312.0 465.0Q344 452 415 438Q498 421 551.5 402.5Q605 384 645.0 342.0Q685 300 686 228Q686 106 603.5 47.0Q521 -12 383 -12Q222 -12 132.5 42.0Q43 96 43 233H252Q252 181 279.0 163.5Q306 146 363 146Q405 146 432.5 155.0Q460 164 460 192Q460 217 429.5 229.5Q399 242 330 256Q246 274 191.0 293.5Q136 313 95.0 358.0Q54 403 54 480Q54 593 141.5 646.5Q229 700 363 700Q495 700 580.0 646.5Q665 593 667 488Z" stroke-linejoin="round" stroke-width="28" fill="#a1a1aa" stroke="#a1a1aa"/></g></g><g transform="translate(428 262) rotate(-6) scale(0.46 -0.46) translate(-389 -344)"><path d="M733 405H522Q522 465 490.5 500.0Q459 535 401 535Q334 535 302.5 493.0Q271 451 271 376V312Q271 238 302.5 195.5Q334 153 399 153Q463 153 496.0 186.0Q529 219 529 279H733Q733 138 646.5 63.0Q560 -12 402 -12Q226 -12 135.5 78.0Q45 168 45 344Q45 520 135.5 610.0Q226 700 402 700Q555 700 644.0 623.5Q733 547 733 405Z" stroke-linejoin="round" stroke-width="28" fill="#e4e4e7" stroke="#e4e4e7"/></g></g></g>
</svg>`);
}

export const BANNER_DONATE = banner(C.bannerFrom, C.bannerTo);
export const BANNER_DONOR = banner("#232328", C.bannerTo);
export const BANNER_CONTRIB = banner("#1a1a1d", C.bannerTo);
