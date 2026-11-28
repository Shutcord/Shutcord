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

import "./updater";
import "./ipcPlugins";
import "./settings";

import { debounce } from "@shared/debounce";
import { IpcEvents } from "@shared/IpcEvents";
import { BrowserWindow, ipcMain, nativeImage, nativeTheme, shell, systemPreferences } from "electron";
import editorHtml from "file://quickCssEditor.html";
import editorIcon from "file://../../assets/logo-dark-128.png?base64";
import { existsSync, FSWatcher, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from "fs";
import { open, readdir, readFile } from "fs/promises";
import { release } from "os";
import { join } from "path";

import { registerCspIpcHandlers } from "./csp/manager";
import { getThemeInfo, stripBOM, UserThemeHeader } from "./themes";
import { ALLOWED_PROTOCOLS, QUICK_CSS_PATH, SETTINGS_DIR, THEMES_DIR, USER_PLUGINS_DIR } from "./utils/constants";
import { ensureSafePath } from "./utils/ensureSafePath";
import { makeLinksOpenExternally } from "./utils/externalLinks";

const RENDERER_CSS_PATH = join(__dirname, IS_VESKTOP ? "shutcordDesktopRenderer.css" : "renderer.css");

mkdirSync(THEMES_DIR, { recursive: true });
mkdirSync(USER_PLUGINS_DIR, { recursive: true });

const EXAMPLE_PLUGIN_PATH = join(USER_PLUGINS_DIR, "_example.js");
if (!existsSync(EXAMPLE_PLUGIN_PATH)) {
    writeFileSync(EXAMPLE_PLUGIN_PATH, `// Your own Shutcord plugins live in this folder as plain .js files. No build needed.
// Copy this file, remove the leading underscore, edit it, then restart Discord (Ctrl+R) and
// switch the plugin on in Settings > Plugins > Custom plugins.
// Files that start with _ or . are ignored.

module.exports = definePlugin({
    name: "HelloCustom",
    description: "Example custom plugin. Adds the /hello command.",
    authors: ["You"],
    usage: "Type /hello in any chat and press Enter.",

    commands: [{
        name: "hello",
        description: "Says hello",
        execute: () => ({ content: "Hello from my own Shutcord plugin!" })
    }],

    start() {
        console.log("[HelloCustom] started");
    },
    stop() {
        console.log("[HelloCustom] stopped");
    }
});
`);
}

registerCspIpcHandlers();

function readCss() {
    return readFile(QUICK_CSS_PATH, "utf-8").catch(() => "");
}

async function listThemes(): Promise<UserThemeHeader[]> {
    const files = await readdir(THEMES_DIR).catch(() => []);

    const themeInfo: UserThemeHeader[] = [];

    for (const fileName of files) {
        if (!fileName.endsWith(".css")) continue;

        const data = await getThemeData(fileName).then(stripBOM).catch(() => null);
        if (data == null) continue;

        themeInfo.push(getThemeInfo(data, fileName));
    }

    return themeInfo;
}

function getThemeData(fileName: string) {
    fileName = fileName.replace(/\?v=\d+$/, "");
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return readFile(safePath, "utf-8");
}

ipcMain.handle(IpcEvents.OPEN_QUICKCSS, () => shell.openPath(QUICK_CSS_PATH));

ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url) => {
    try {
        var { protocol } = new URL(url);
    } catch {
        throw "Malformed URL";
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol))
        throw "Disallowed protocol.";

    shell.openExternal(url)
        .catch(err => console.error("[Shutcord] Failed to open external link", url, err));
});


ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());
ipcMain.handle(IpcEvents.SET_QUICK_CSS, (_, css) =>
    writeFileSync(QUICK_CSS_PATH, css)
);

ipcMain.handle(IpcEvents.GET_THEMES_LIST, () => listThemes());
ipcMain.handle(IpcEvents.GET_THEME_DATA, (_, fileName) => getThemeData(fileName));
ipcMain.handle(IpcEvents.GET_THEME_SYSTEM_VALUES, () => {
    let accentColor = systemPreferences.getAccentColor?.() ?? "";

    if (accentColor.length && accentColor[0] !== "#") {
        accentColor = `#${accentColor}`;
    }

    return {
        "os-accent-color": accentColor
    };
});

ipcMain.handle(IpcEvents.OPEN_THEMES_FOLDER, () => shell.openPath(THEMES_DIR));
ipcMain.handle(IpcEvents.OPEN_PLUGINS_FOLDER, () => shell.openPath(USER_PLUGINS_DIR));
ipcMain.on(IpcEvents.GET_USER_PLUGINS, e => {
    try {
        e.returnValue = readdirSync(USER_PLUGINS_DIR)
            .filter(file => file.endsWith(".js") && !file.startsWith("_") && !file.startsWith("."))
            .map(file => ({ file, code: readFileSync(join(USER_PLUGINS_DIR, file), "utf-8") }));
    } catch {
        e.returnValue = [];
    }
});
ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, () => shell.openPath(SETTINGS_DIR));

let fsWatchers = [] as FSWatcher[];

ipcMain.handle(IpcEvents.INIT_FILE_WATCHERS, ({ sender }) => {
    fsWatchers.forEach(w => w.close());

    let quickCssWatcher: FSWatcher | undefined;
    let rendererCssWatcher: FSWatcher | undefined;

    open(QUICK_CSS_PATH, "a+").then(fd => {
        fd.close();
        quickCssWatcher = watch(QUICK_CSS_PATH, { persistent: false }, debounce(async () => {
            sender.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readCss());
        }, 50));
    }).catch(() => { });

    const themesWatcher = watch(THEMES_DIR, { persistent: false }, debounce(() => {
        sender.postMessage(IpcEvents.THEME_UPDATE, void 0);
    }));

    if (IS_DEV) {
        rendererCssWatcher = watch(RENDERER_CSS_PATH, { persistent: false }, async () => {
            sender.postMessage(IpcEvents.RENDERER_CSS_UPDATE, await readFile(RENDERER_CSS_PATH, "utf-8"));
        });
    }

    fsWatchers = [quickCssWatcher, themesWatcher, rendererCssWatcher].filter(Boolean) as FSWatcher[];

    sender.once("destroyed", () => {
        quickCssWatcher?.close();
        themesWatcher.close();
        rendererCssWatcher?.close();
        fsWatchers = [];
    });
});

ipcMain.on(IpcEvents.GET_MONACO_THEME, e => {
    e.returnValue = nativeTheme.shouldUseDarkColors ? "vs-dark" : "vs-light";
});

function setEditorIcon(win: BrowserWindow) {
    try {
        const icon = nativeImage.createFromDataURL("data:image/png;base64," + editorIcon);
        if (!icon.isEmpty()) win.setIcon(icon);
    } catch { }
}

ipcMain.handle(IpcEvents.OPEN_MONACO_EDITOR, async () => {
    const title = "Shutcord QuickCSS";
    const existingWindow = BrowserWindow.getAllWindows().find(w => w.title === title);
    if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.focus();
        return;
    }

    const win = new BrowserWindow({
        title,
        width: 900,
        height: 640,
        autoHideMenuBar: true,
        darkTheme: true,
        backgroundColor: "#121214",
        webPreferences: {
            preload: join(__dirname, IS_DISCORD_DESKTOP ? "preload.js" : "shutcordDesktopPreload.js"),
            additionalArguments: ["--shutcord-editor"],
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    win.on("page-title-updated", ev => ev.preventDefault());

    // Intercept quit shortcuts so they don't quit the main application
    win.webContents.on("before-input-event", (ev, input) => {
        if (input.type !== "keyDown") return;

        const key = input.key.toLowerCase();
        const isQuit = (input.control && !input.alt && !input.shift && key === "q")
            || (input.alt && !input.control && !input.shift && key === "f4");

        if (isQuit) {
            ev.preventDefault();
            win.close();
        }
    });

    makeLinksOpenExternally(win);
    setEditorIcon(win);

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(editorHtml));
});

ipcMain.handle(IpcEvents.GET_RENDERER_CSS, () => readFile(RENDERER_CSS_PATH, "utf-8"));

if (IS_DISCORD_DESKTOP) {
    ipcMain.on(IpcEvents.PRELOAD_GET_RENDERER_JS, e => {
        e.returnValue = readFileSync(join(__dirname, "renderer.js"), "utf-8");
    });
}

ipcMain.on(IpcEvents.SUPPORTS_WINDOWS_MATERIAL, e => {
    e.returnValue = process.platform === "win32" && Number(release().split(".")[2]) >= 22621;
});
