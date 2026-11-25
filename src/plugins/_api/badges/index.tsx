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

import "./fixDiscordBadgePadding.css";

import { Settings } from "@api/Settings";
import { SHUTCORD_API } from "@shared/api";
import { _getBadges, BadgePosition, BadgeRarity, BadgeUserArgs, DirectoryBadge, ProfileBadge } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { CopyIcon, LinkIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import DonateButton from "@components/settings/DonateButton";
import { openContributorModal } from "@components/settings/tabs";
import { LOGO_IMAGE } from "@components/settings/tabs/shutcord/art";
import { Text } from "@components/Text";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { shouldShowContributorBadge } from "@utils/misc";
import { listSponsorIds, resolveCustomBadges, resolveSponsorBadges, resolveSponsorTierNames, SponsorBadge, SponsorsFile } from "@utils/sponsors";
import definePlugin from "@utils/types";
import { ContextMenuApi, Menu, Modal, openModal, showToast, UserStore } from "@webpack/common";

const ContributorBadge: ProfileBadge = {
    id: "shutcord_contributor_badge",
    description: "Shutcord Contributor",
    infoLabel: "Shutcord",
    rarity: BadgeRarity.MYTHIC,
    iconSrc: "https://raw.githubusercontent.com/Shutcord/Shutcord/main/badges/shutcord.png",
    largeIconSrc: "https://raw.githubusercontent.com/Shutcord/Shutcord/main/badges/shutcord@2x.png",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => shouldShowContributorBadge(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};


let DonorBadges = {} as Record<string, SponsorBadge[]>;
let CustomBadges = {} as Record<string, SponsorBadge[]>;
let SponsorIds = new Set<string>();
let SponsorTierNames = {} as Record<string, string>;
let DirectoryBadges = {} as Record<string, DirectoryBadge>;

async function loadBadges(noCache = false) {
    const init = {} as RequestInit;
    if (noCache)
        init.cache = "no-cache";

    try {
        const source = SHUTCORD_API || "https://raw.githubusercontent.com/Shutcord/Shutcord/main";
        const data: SponsorsFile = await fetch(`${source}/sponsors.json`, init)
            .then(r => r.json());
        DonorBadges = resolveSponsorBadges(data, SHUTCORD_API ? [new URL(SHUTCORD_API).hostname] : []);
        CustomBadges = resolveCustomBadges(data, SHUTCORD_API ? [new URL(SHUTCORD_API).hostname] : []);
        SponsorIds = listSponsorIds(data);
        SponsorTierNames = resolveSponsorTierNames(data);
    } catch (err) {
        console.warn("[Shutcord] Failed to load sponsors.json, continuing without them", err);
    }
}

let intervalId: any;

function toDirectoryBadge(b: ProfileBadge, userId: string): DirectoryBadge {
    const id = `sc-${userId}-${b.id}`;

    return DirectoryBadges[id] ??= {
        badge_id: id,
        name: b.name ?? b.description ?? "",
        description: b.detail ?? b.description ?? b.name ?? "",
        info_label: b.infoLabel ?? "Shutcord",
        rarity: b.rarity ?? BadgeRarity.COMMON,
        simple_icon_url: b.iconSrc!,
        complex_icon_static_url: b.largeIconSrc ?? b.iconSrc!,
        obtained_at: b.obtainedAt,
        is_earnable: false,
        owned: true,
        hidden: false,
        tiers: []
    };
}

function BadgeContextMenu({ badge }: { badge: Omit<ProfileBadge, "id"> & BadgeUserArgs; }) {
    return (
        <Menu.Menu
            navId="sc-badge-context"
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Badge Options"
        >
            {badge.description && (
                <Menu.MenuItem
                    id="sc-badge-copy-name"
                    label="Copy Badge Name"
                    action={() => copyWithToast(badge.description!)}
                    leadingAccessory={{ type: "icon", icon: CopyIcon }}
                />
            )}
            {badge.iconSrc && (
                <Menu.MenuItem
                    id="sc-badge-copy-link"
                    label="Copy Badge Image Link"
                    action={() => copyWithToast(badge.iconSrc!)}
                    leadingAccessory={{ type: "icon", icon: LinkIcon }}
                />
            )}
        </Menu.Menu>
    );
}

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun, Devs.kaxtusik],
    required: true,
    patches: [
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /alt:" ","aria-hidden":!0,src:.{0,50}(\i).iconSrc/,
                    replace: "...$1.props,$&"
                },
                // Path with 2026-04-badge-discovery OFF
                {
                    match: /(?<=forceOpen:.{0,40}?ariaHidden:!0,)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                // Path with 2026-04-badge-discovery ON
                {
                    match: /(?<=fallbackIconSrc:.{0,50}?)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                // handle onClick and onContextMenu
                {
                    match: /href:(\i)\.link/,
                    replace: "...$self.getBadgeMouseEventHandlers($1),$&"
                },
                {
                    match: /legacyBadgeId:(\i),userId:(\i),.{0,100}?=\i,\i=\(0,\i\.\i\)\(\1\)/,
                    replace: "$&??$self.getDirectoryBadgeId($1,$2)"
                }
            ]
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{.{0,100}?return\[/,
                replace: "$&...$self.getBadges(this),"
            }
        },
        {
            find: '"BadgeDirectoryStore"',
            replacement: {
                match: /getBadgeById\((\i),(\i)\)\{/,
                replace: "$&const shutcordBadge=$self.getDirectoryBadge($1);if(shutcordBadge)return shutcordBadge;"
            }
        },
        {
            find: "badge_directory_closed",
            replacement: {
                match: /(\i\.\i\.getBadges\((\i)\))(?=:\[\],\[\2\]\))/,
                replace: "[...$1,...$self.getDirectoryBadges($2)]"
            }
        }
    ],

    // for access from the console or other plugins
    get DonorBadges() {
        return DonorBadges;
    },

    isSponsor(userId: string) {
        return SponsorIds.has(userId);
    },

    toolboxActions: {
        async "Refetch Badges"() {
            await loadBadges(true);
            showToast({ text: "Successfully refetched badges!", variant: "success" });
        }
    },

    userProfileBadge: ContributorBadge,

    async start() {
        await loadBadges();

        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30); // 30 minutes
    },

    async stop() {
        clearInterval(intervalId);
        DirectoryBadges = {};
    },

    getBadges(profile: { userId: string; guildId: string; }) {
        if (!profile) return [];

        try {
            return _getBadges(profile);
        } catch (e) {
            new Logger("BadgeAPI#getBadges").error(e);
            return [];
        }
    },

    getDirectoryBadge(id: string) {
        return DirectoryBadges[id];
    },

    getDirectoryBadges(userId: string) {
        return this.getBadges({ userId, guildId: "" })
            .filter(b => b.iconSrc)
            .map(b => toDirectoryBadge(b, userId));
    },

    getDirectoryBadgeId(badgeId: string, userId?: string) {
        if (!userId) return;

        const badge = this.getBadges({ userId, guildId: "" })
            .find(b => b.id === badgeId && b.iconSrc);

        if (badge) return toDirectoryBadge(badge, userId).badge_id;
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),


    getBadgeMouseEventHandlers(badge: ProfileBadge & BadgeUserArgs) {
        const handlers = {} as Record<string, (e: React.MouseEvent) => void>;

        if (!badge) return handlers; // sanity check

        const { onClick, onContextMenu } = badge;

        if (onClick) handlers.onClick = e => onClick(e, badge);
        if (onContextMenu) handlers.onContextMenu = e => onContextMenu(e, badge);

        return handlers;
    },

    getCustomBadges(userId: string) {
        if (Settings.hideSponsorBadges) return undefined;
        if (Settings.hideOwnSponsorBadges && userId === UserStore.getCurrentUser()?.id) return undefined;

        return CustomBadges[userId]?.map((badge, idx) => ({
            id: `shutcord_custom_badge_${idx}`,
            iconSrc: badge.badge,
            description: badge.tooltip,
            name: badge.tooltip,
            infoLabel: "Shutcord",
            rarity: BadgeRarity.RARE,
            position: BadgePosition.START,
            props: { style: { borderRadius: "50%", transform: "scale(0.9)" } },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },
        } satisfies ProfileBadge));
    },

    getDonorBadges(userId: string) {
        if (Settings.hideSponsorBadges) return undefined;
        if (Settings.hideOwnSponsorBadges && userId === UserStore.getCurrentUser()?.id) return undefined;

        return DonorBadges[userId]?.map((badge, idx) => {
            let largeIconSrc: string | undefined = undefined;
            if (badge["2"]) {
                const url = new URL(badge.badge);
                url.pathname = url.pathname.replace(/(\.[^/.]+)$/, "@2x$1");
                largeIconSrc = url.toString();
            }

            return {
                id: `shutcord_donor_badge_${idx}`,
                iconSrc: badge.badge,
                largeIconSrc,
                description: badge.tooltip,
                name: badge.tooltip,
                infoLabel: "Shutcord Donor",
                rarity: BadgeRarity.MYTHIC,
                position: BadgePosition.START,
                props: {
                    style: {
                        borderRadius: "50%",
                        transform: "scale(0.9)" // The image is a bit too big compared to default badges
                    }
                },
                onContextMenu(event, badge) {
                    ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
                },
                onClick() {
                    openModal(props => (
                        <ErrorBoundary noop onError={() => {
                            props.onClose();
                            ShutcordNative.native.openExternal("https://github.com/Shutcord/Shutcord");
                        }}>
                            <Modal
                                {...props}
                                title={
                                    <Text
                                        size="lg"
                                        weight="semibold"
                                        style={{
                                            width: "100%",
                                            textAlign: "center"
                                        }}
                                    >
                                        <Flex justifyContent="center" alignItems="center" gap="0.5em">
                                            <Heart />
                                            Shutcord Donor
                                        </Flex>
                                    </Text>
                                }
                            >
                                <div>
                                    <Flex justifyContent="center" alignItems="center" flexDirection="column" gap="0.75em" style={{ padding: "1.25em 1em 0" }}>
                                        <img role="presentation" src={LOGO_IMAGE} alt="" style={{ width: 150 }} />
                                        {SponsorTierNames[userId] && (
                                            <Text size="sm" weight="semibold" style={{ padding: "2px 12px", borderRadius: 999, background: "var(--background-mod-subtle)" }}>
                                                {SponsorTierNames[userId]}
                                            </Text>
                                        )}
                                        <Flex justifyContent="center" gap="8px">
                                            {DonorBadges[userId]?.map(b => (
                                                <img key={b.badge} src={b.badge} alt={b.tooltip ?? ""} title={b.tooltip} style={{ width: 40, height: 40, borderRadius: "50%" }} />
                                            ))}
                                        </Flex>
                                    </Flex>
                                    <div style={{ padding: "1em" }}>
                                        <Paragraph style={{ textAlign: "center" }}>
                                            This badge belongs to a Shutcord sponsor. Thank you for keeping Shutcord free!
                                        </Paragraph>
                                        <Paragraph className={Margins.top16} style={{ textAlign: "center" }}>
                                            Sponsors get profile badges and a role in the community server.
                                        </Paragraph>
                                    </div>
                                </div>
                                <div>
                                    <Flex justifyContent="center" style={{ width: "100%" }}>
                                        <DonateButton variant="overlayPrimary" />
                                    </Flex>
                                </div>
                            </Modal>
                        </ErrorBoundary>
                    ));
                },
            } satisfies ProfileBadge;
        });
    }
});
