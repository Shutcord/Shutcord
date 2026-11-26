/*
 * Shutcord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle, managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

import style from "./theme.css?managed";

let vars: HTMLStyleElement | undefined;

function applyVars() {
    vars ??= createAndAppendStyle("shutcord-theme-vars", managedStyleRootNode);
    const { radius, glass } = settings.store;
    vars.textContent = `:root{--sc-radius:${radius}px;--sc-blur:${glass ? 14 : 0}px;}`;
}

const settings = definePluginSettings({
    radius: {
        type: OptionType.SLIDER,
        description: "Corner roundness of popups, menus and cards",
        markers: [0, 4, 8, 12, 16, 20],
        default: 12,
        stickToMarkers: false,
        onChange: applyVars
    },
    glass: {
        type: OptionType.BOOLEAN,
        description: "Frosted glass blur behind popups, menus and tooltips",
        default: true,
        onChange: applyVars
    }
});

export default definePlugin({
    name: "ShutcordTheme",
    description: "The Shutcord look: flat one-tone grey, soft corners, frosted popups and calm settings. Turn it off to get plain Discord back",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    enabledByDefault: true,
    settings,

    start() {
        applyVars();
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
        vars?.remove();
        vars = undefined;
    }
});
