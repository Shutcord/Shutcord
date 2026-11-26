/*
 * Shutcord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

export const enum IpcEvents {
    INIT_FILE_WATCHERS = "ShutcordInitFileWatchers",

    OPEN_QUICKCSS = "ShutcordOpenQuickCss",
    GET_QUICK_CSS = "ShutcordGetQuickCss",
    SET_QUICK_CSS = "ShutcordSetQuickCss",
    QUICK_CSS_UPDATE = "ShutcordQuickCssUpdate",

    GET_SETTINGS = "ShutcordGetSettings",
    SET_SETTINGS = "ShutcordSetSettings",

    GET_THEMES_LIST = "ShutcordGetThemesList",
    GET_THEME_DATA = "ShutcordGetThemeData",
    GET_THEME_SYSTEM_VALUES = "ShutcordGetThemeSystemValues",
    THEME_UPDATE = "ShutcordThemeUpdate",

    OPEN_EXTERNAL = "ShutcordOpenExternal",
    OPEN_THEMES_FOLDER = "ShutcordOpenThemesFolder",
    OPEN_PLUGINS_FOLDER = "ShutcordOpenPluginsFolder",
    GET_USER_PLUGINS = "ShutcordGetUserPlugins",
    OPEN_SETTINGS_FOLDER = "ShutcordOpenSettingsFolder",

    GET_UPDATES = "ShutcordGetUpdates",
    GET_REPO = "ShutcordGetRepo",
    UPDATE = "ShutcordUpdate",
    BUILD = "ShutcordBuild",

    OPEN_MONACO_EDITOR = "ShutcordOpenMonacoEditor",
    GET_MONACO_THEME = "ShutcordGetMonacoTheme",

    GET_PLUGIN_IPC_METHOD_MAP = "ShutcordGetPluginIpcMethodMap",

    CSP_IS_DOMAIN_ALLOWED = "ShutcordCspIsDomainAllowed",
    CSP_REMOVE_OVERRIDE = "ShutcordCspRemoveOverride",
    CSP_REQUEST_ADD_OVERRIDE = "ShutcordCspRequestAddOverride",

    GET_RENDERER_CSS = "ShutcordGetRendererCss",
    RENDERER_CSS_UPDATE = "ShutcordRendererCssUpdate",
    PRELOAD_GET_RENDERER_JS = "ShutcordPreloadGetRendererJs",

    SUPPORTS_WINDOWS_MATERIAL = "ShutcordSupportsWindowsMaterial",
}
