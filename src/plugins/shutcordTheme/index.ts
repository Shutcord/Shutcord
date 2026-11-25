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

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function applyVars() {
    vars ??= createAndAppendStyle("shutcord-theme-vars", managedStyleRootNode);
    const accent = HEX.test(settings.store.accent) ? settings.store.accent : "#d4d4d8";
    vars.textContent = `:root{--sc-accent:${accent};--sc-radius:${settings.store.radius}px;}`;
}

const settings = definePluginSettings({
    accent: {
        type: OptionType.STRING,
        description: "Accent color (hex). Grey by default; try #a78bfa, #60a5fa or #34d399",
        default: "#d4d4d8",
        onChange: applyVars,
        isValid: v => HEX.test(v) || "Use a hex color like #d4d4d8"
    },
    radius: {
        type: OptionType.SLIDER,
        description: "Corner roundness of popups, menus and cards",
        markers: [0, 4, 8, 12, 16],
        default: 12,
        stickToMarkers: false,
        onChange: applyVars
    }
});

export default definePlugin({
    name: "ShutcordTheme",
    description: "The Shutcord base theme: flat grey look, rounder popups, calmer settings. Turn it off to get plain Discord back",
    tags: ["Appearance", "Shutcord"],
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
