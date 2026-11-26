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
import type { PluginDef, PluginOrigin } from "@utils/types";

import { PORTED_ORIGINS } from "./portedOrigins";

export function getPluginOrigin(plugin: Pick<PluginDef, "name" | "authors" | "origin">): PluginOrigin {
    if (plugin.origin) return plugin.origin;
    if (PORTED_ORIGINS[plugin.name]) return PORTED_ORIGINS[plugin.name];
    if (plugin.name.startsWith("Shutcord") || plugin.authors.some(a => a.id === Devs.Shutcord.id)) return "shutcord";
    return "vencord";
}
