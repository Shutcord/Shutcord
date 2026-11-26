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

// Ported from Equicord (GPL-3.0). Original authors are listed in `authors`.

import { ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function getMessage(opts) {
    const inputOption = findOption(opts, "input", "");

    let queryURL = "" + searchEngines[settings.store.defaultEngine] + encodeURIComponent(inputOption);

    if (settings.store.customEngineURL) {
        queryURL = "" + [settings.store.customEngineURL] + encodeURIComponent(inputOption);
    }

    if (settings.store.hyperlink && !settings.store.embed) {
        return `[${inputOption}](<${queryURL}>)`;
    }
    else if (settings.store.hyperlink) {
        return `[${inputOption}](${queryURL})`;
    }
    else if (!settings.store.embed) {
        return `<${queryURL}>`;
    }
    else {
        return queryURL;
    }
}

const searchEngines = {
    "Google": "https://www.google.com/search?q=",
    "Bing": "https://www.bing.com/search?q=",
    "Yahoo": "https://search.yahoo.com/search?p=",
    "DuckDuckGo": "https://duckduckgo.com/?q=",
    "Baidu": "https://www.baidu.com/s?wd=",
    "Yandex": "https://yandex.com/search/?text=",
    "Ecosia": "https://www.ecosia.org/search?q=",
    "Ask": "https://www.ask.com/web?q=",
    "AOL": "https://search.aol.com/aol/search?q=",
    "LetMeGoogleThatForYou": "https://letmegooglethat.com/?q="
};

const settings = definePluginSettings({
    hyperlink: {
        type: OptionType.BOOLEAN,
        description: "If the sent link should hyperlink with the query as the label",
        default: false
    },
    embed: {
        type: OptionType.BOOLEAN,
        description: "If the sent link should render an embed",
        default: true
    },
    defaultEngine: {
        type: OptionType.SELECT,
        description: "The search engine to use",
        options: Object.keys(searchEngines).map((key, index) => ({
            label: key,
            value: key,
            default: index === 0
        }))
    },
    customEngineURL: {
        description: "The URL of the Engine you wish to use",
        type: OptionType.STRING,
        placeholder: ""
    }
});

export default definePlugin({
    name: "GoogleThat",
    origin: "equicord",
    description: "Adds a command to send a internet search link",
    dependencies: ["CommandsAPI"],
    tags: ["Commands", "Utility"],
    authors: [Devs.Samwich, Devs.PortKrystalskullofficial],
    searchTerms: ["search", "google", "query", "duckduckgo", "command"],
    settings,
    commands: [
        {
            name: "googlethat",
            description: "send a search engine link",
            options: [
                {
                    name: "input",
                    description: "The search query",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                }
            ],
            execute: opts => ({
                content: getMessage(opts)
            }),
        }
    ]
});
