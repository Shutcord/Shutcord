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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { getShutcordColors } from "@plugins/shutcordProfiles";
import { SHUTCORD_API } from "@shared/api";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { UserProfileStore, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    nitroFirst: {
        description: "If someone has real Nitro colours too, show those instead of their Shutcord colours",
        type: OptionType.BOOLEAN,
        default: false
    }
});

interface ProfileModalProps {
    user: User;
    pendingThemeColors: [number, number];
    onAvatarChange: () => void;
    onBannerChange: () => void;
    canUsePremiumCustomization: boolean;
    hideExampleButton: boolean;
    hideFakeActivity: boolean;
    isTryItOut: boolean;
}

const ProfileModal = findComponentByCodeLazy<ProfileModalProps>("isTryItOut:", "pendingThemeColors:", "pendingAvatarDecoration:", "EDIT_PROFILE_BANNER");

function AboutComponent() {
    const me = UserStore.getCurrentUser();
    const colors = getShutcordColors(me.id) ?? UserProfileStore.getUserProfile(me.id)?.themeColors ?? null;

    return (
        <section>
            <Heading className={Margins.bottom8}>How it works</Heading>
            <Paragraph>
                Your profile colours and banner are saved on your Shutcord page and drawn for everyone who runs Shutcord.
                No Nitro and no copy and paste.
            </Paragraph>
            <ol className={Margins.top8}>
                <li>Press <b>Edit my profile</b> below and sign in with Discord.</li>
                <li>Pick your colours, drop a banner and press <b>Save</b>.</li>
                <li>Colours show up here and on your profile within a few minutes.</li>
            </ol>
            <Button
                className={Margins.top8}
                onClick={() => ShutcordNative.native.openExternal(SHUTCORD_API + "/me")}
            >
                Edit my profile
            </Button>

            <Heading className={Margins.top16}>Your profile right now</Heading>
            {colors
                ? <div className="sc-fpt-preview">
                    <ProfileModal
                        user={me}
                        pendingThemeColors={colors as [number, number]}
                        onAvatarChange={() => { }}
                        onBannerChange={() => { }}
                        canUsePremiumCustomization={true}
                        hideExampleButton={true}
                        hideFakeActivity={true}
                        isTryItOut={true}
                    />
                </div>
                : <Paragraph>You have not saved any colours yet.</Paragraph>
            }
        </section>
    );
}

export default definePlugin({
    name: "ShutcordProfileColors",
    description: "Draws Shutcord profile colours everywhere in Discord",
    usage: "Open Edit my profile in this window, choose your colours and save. Other Shutcord users see them on your profile.",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Shutcord],
    enabledByDefault: true,
    dependencies: ["ShutcordProfiles"],
    settings,
    settingsAboutComponent: AboutComponent,

    patches: [
        {
            find: "}getPreviewThemeColors(",
            replacement: [
                {
                    match: /(}getPreviewThemeColors\(.+?)this\.themeColors/,
                    replace: "$1$self.colorHook(this)"
                },
                {
                    match: /canEditThemes\(\){/,
                    replace: "$&return true;"
                }
            ],
        }
    ],

    colorHook(profile: any) {
        const saved = getShutcordColors(profile?.userId);
        if (saved != null && !(settings.store.nitroFirst && profile?.themeColors != null)) return saved;

        return profile?.themeColors;
    }
});
