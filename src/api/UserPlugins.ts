/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2025 Shutcord contributors
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
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, StartAt } from "@utils/types";

import Plugins, { PluginMeta } from "~plugins";

const logger = new Logger("CustomPlugins", "#a6d189");

/** Loads plain .js plugins from the user's plugins folder so no build is needed */
export function loadUserPlugins() {
    const files = ShutcordNative.userPlugins?.get() ?? [];

    for (const { file, code } of files) {
        try {
            const module = { exports: {} as any };
            const returned = new Function(
                "module", "exports", "definePlugin", "definePluginSettings", "OptionType", "StartAt", "Devs",
                code + `\n//# sourceURL=shutcord-plugin://${file}`
            )(module, module.exports, definePlugin, definePluginSettings, OptionType, StartAt, Devs);

            const raw = module.exports?.default ?? (Object.keys(module.exports).length ? module.exports : returned);
            if (!raw || typeof raw.name !== "string" || typeof raw.description !== "string")
                throw new Error("a plugin needs a name and a description. End the file with module.exports = definePlugin({ ... })");
            if (raw.name in Plugins)
                throw new Error(`a plugin called ${raw.name} already exists`);

            const authors = (Array.isArray(raw.authors) && raw.authors.length ? raw.authors : ["You"])
                .map((a: any) => typeof a === "string" ? { name: a, id: 0n } : { name: String(a.name ?? "You"), id: a.id ? BigInt(a.id) : 0n });

            const plugin = definePlugin({ ...raw, authors, tags: raw.tags ?? [], started: false });
            Plugins[plugin.name] = plugin;
            PluginMeta[plugin.name] = { folderName: `plugins/${file}`, userPlugin: true };
        } catch (e) {
            logger.error(`Failed to load ${file}:`, e);
        }
    }
}
