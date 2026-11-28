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

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Switch } from "@components/Switch";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { TextInput, UserStore, useState } from "@webpack/common";

const CDN = "https://cdn.discordapp.com/badge-icons/";

const PRESETS: { key: string; label: string; icon: string; }[] = [
    { key: "staff", label: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d" },
    { key: "partner", label: "Partnered Server Owner", icon: "3f9748e53446a137a052f3454e2de41e" },
    { key: "certified_moderator", label: "Moderator Programs Alumni", icon: "fee1624003e2fee35cb398e125dc479b" },
    { key: "hypesquad", label: "HypeSquad Events", icon: "bf01d1073931f921909045f3a39fd264" },
    { key: "bravery", label: "HypeSquad Bravery", icon: "8a88d63823d8a71cd5e390baa45efa02" },
    { key: "brilliance", label: "HypeSquad Brilliance", icon: "011940fd013da3f7fb926e4a1cd2e618" },
    { key: "balance", label: "HypeSquad Balance", icon: "3aa41de486fa12454c3761e8e223442e" },
    { key: "bug1", label: "Discord Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0" },
    { key: "bug2", label: "Discord Bug Hunter (gold)", icon: "848f79194d4be5ff5f81505cbd0ce1e6" },
    { key: "early_supporter", label: "Early Supporter", icon: "7060786766c9c840eb3019e725d2b358" },
    { key: "bot_dev", label: "Early Verified Bot Developer", icon: "6df5892e0f35b051f8b61eace34f4967" },
    { key: "active_dev", label: "Active Developer", icon: "6bdc42827a38498929a4920da12695d9" },
    { key: "nitro", label: "Nitro Subscriber", icon: "2ba85e8026a8614b640c2837bcdfe21b" }
];

interface CustomBadge { name: string; url: string; }

function readJson<T>(raw: string, fallback: T): T {
    try {
        const v = JSON.parse(raw);
        return v ?? fallback;
    } catch {
        return fallback;
    }
}

const settings = definePluginSettings({
    userId: {
        type: OptionType.STRING,
        description: "User ID to change. Leave empty to change yourself",
        default: ""
    },
    username: {
        type: OptionType.STRING,
        description: "Username shown for them (empty keeps the real one)",
        default: ""
    },
    displayName: {
        type: OptionType.STRING,
        description: "Display name shown for them (empty keeps the real one)",
        default: ""
    },
    avatarUrl: {
        type: OptionType.STRING,
        description: "Image link for their avatar (empty keeps the real one)",
        default: ""
    },
    fakeNitro: {
        type: OptionType.BOOLEAN,
        description: "Show them as a Nitro user (client side)",
        default: false
    },
    badgeKeys: {
        type: OptionType.STRING,
        description: "",
        default: "[]",
        hidden: true
    },
    customBadges: {
        type: OptionType.STRING,
        description: "",
        default: "[]",
        hidden: true
    },
    badges: {
        type: OptionType.COMPONENT,
        component: () => (
            <ErrorBoundary noop>
                <BadgeEditor />
            </ErrorBoundary>
        )
    }
});

function BadgeEditor() {
    const [keys, setKeys] = useState<string[]>(() => readJson(settings.store.badgeKeys, []));
    const [custom, setCustom] = useState<CustomBadge[]>(() => readJson(settings.store.customBadges, []));
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");

    const saveKeys = (next: string[]) => {
        setKeys(next);
        settings.store.badgeKeys = JSON.stringify(next);
        refreshBadges();
    };
    const saveCustom = (next: CustomBadge[]) => {
        setCustom(next);
        settings.store.customBadges = JSON.stringify(next);
        refreshBadges();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 600 }}>Badges</div>
            {PRESETS.map(p => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={`${CDN}${p.icon}.png`} width={22} height={22} alt="" />
                    <span style={{ flex: 1 }}>{p.label}</span>
                    <Switch
                        checked={keys.includes(p.key)}
                        onChange={on => saveKeys(on ? [...keys, p.key] : keys.filter(k => k !== p.key))}
                    />
                </div>
            ))}

            <div style={{ fontWeight: 600, marginTop: 8 }}>Custom badges</div>
            {custom.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={c.url} width={22} height={22} alt="" />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <Button size="small" variant="dangerPrimary" onClick={() => saveCustom(custom.filter((_, j) => j !== i))}>
                        Remove
                    </Button>
                </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
                <TextInput placeholder="Badge name" value={name} onChange={setName} style={{ flex: 1 }} />
                <TextInput placeholder="Image link" value={url} onChange={setUrl} style={{ flex: 2 }} />
                <Button
                    size="small"
                    disabled={!name.trim() || !url.trim()}
                    onClick={() => {
                        saveCustom([...custom, { name: name.trim(), url: url.trim() }]);
                        setName("");
                        setUrl("");
                    }}
                >
                    Add
                </Button>
            </div>
        </div>
    );
}

function targetId(): string | undefined {
    return settings.store.userId.trim() || UserStore.getCurrentUser()?.id;
}

let activeBadges: ProfileBadge[] = [];

function refreshBadges() {
    for (const b of activeBadges) removeProfileBadge(b);
    activeBadges = [];

    const keys = readJson<string[]>(settings.store.badgeKeys, []);
    const custom = readJson<CustomBadge[]>(settings.store.customBadges, []);
    const shouldShow = ({ userId }: { userId: string; }) => userId === targetId();

    const make = (id: string, description: string, iconSrc: string) => {
        const badge: ProfileBadge = { id, key: id, description, iconSrc, position: BadgePosition.START, shouldShow };
        activeBadges.push(badge);
        addProfileBadge(badge);
    };

    for (const key of keys) {
        const p = PRESETS.find(x => x.key === key);
        if (p) make(`shutcord-larp-${p.key}`, p.label, `${CDN}${p.icon}.png`);
    }
    custom.forEach((c, i) => make(`shutcord-larp-custom-${i}`, c.name, c.url));
}

interface Original {
    username: string;
    globalName: string | null | undefined;
    premiumType: number | null | undefined;
    getAvatarURL: any;
    own: boolean;
}

const originals = new Map<string, Original>();
let timer: ReturnType<typeof setInterval> | undefined;
let lastTarget: string | undefined;

function restore() {
    for (const [id, o] of originals) {
        const user: any = UserStore.getUser(id);
        if (!user) continue;
        user.username = o.username;
        user.globalName = o.globalName;
        user.premiumType = o.premiumType;
        if (o.own) delete user.getAvatarURL;
        else user.getAvatarURL = o.getAvatarURL;
    }
    originals.clear();
}

function apply() {
    const id = targetId();
    if (!id) return;
    if (lastTarget && lastTarget !== id) restore();
    lastTarget = id;

    const user: any = UserStore.getUser(id);
    if (!user) return;

    const { username, displayName, avatarUrl, fakeNitro } = settings.store;

    if (!originals.has(id)) {
        originals.set(id, {
            username: user.username,
            globalName: user.globalName,
            premiumType: user.premiumType,
            getAvatarURL: user.getAvatarURL,
            own: !Object.prototype.hasOwnProperty.call(user, "getAvatarURL")
        });
    }
    const o = originals.get(id)!;

    // the user object is swapped out by Discord from time to time, so compare before touching it
    if (username.trim() && user.username !== username.trim()) user.username = username.trim();
    if (!username.trim() && user.username !== o.username) user.username = o.username;

    if (displayName.trim() && user.globalName !== displayName.trim()) user.globalName = displayName.trim();
    if (!displayName.trim() && user.globalName !== o.globalName) user.globalName = o.globalName;

    const wantNitro = fakeNitro ? 2 : o.premiumType;
    if (user.premiumType !== wantNitro) user.premiumType = wantNitro;

    if (avatarUrl.trim()) {
        const link = avatarUrl.trim();
        user.getAvatarURL = () => link;
    } else if (o.own) {
        delete user.getAvatarURL;
    } else {
        user.getAvatarURL = o.getAvatarURL;
    }

    (UserStore as any).emitChange?.();
}

export default definePlugin({
    name: "ShutcordLarp",
    description: "Client side only: change how any user's name, avatar and badges look to you. Only you see it, nothing is sent to Discord",
    tags: ["Customisation", "Fun"],
    authors: [Devs.Shutcord],
    settings,

    start() {
        refreshBadges();
        apply();
        timer = setInterval(apply, 1500);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
        for (const b of activeBadges) removeProfileBadge(b);
        activeBadges = [];
        restore();
        lastTarget = undefined;
        (UserStore as any).emitChange?.();
    }
});
