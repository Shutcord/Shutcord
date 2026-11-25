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

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { getPluginOrigin } from "@utils/pluginOrigin";
import { PluginTarget } from "@utils/pluginTargets";
import { promptToRestart } from "@utils/promptToRestart";
import { useAwaiter, useCleanupEffect } from "@utils/react";
import { PluginOrigin, PluginTag, PluginTags } from "@utils/types";
import { lodash, React, SearchableSelect, TextInput, Tooltip, useMemo, useRef, useState } from "@webpack/common";
import { JSX } from "react";

import Plugins, { ExcludedPlugins, PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { UIElementsButton } from "./UIElements";

export const cl = classNameFactory("sc-plugins-");
export const logger = new Logger("PluginSettings", "#a6d189");

function ReloadRequiredCard() {
    return (
        <Card variant="warning" className={cl("info-card")}>
            <Heading tag="h4">Restart required!</Heading>
            <Paragraph className={cl("dep-text")}>
                Restart now to apply new plugins and their settings
            </Paragraph>
            <Button onClick={() => location.reload()} className={cl("restart-button")}>
                Restart
            </Button>
        </Card>
    );
}

type Source = "vencord" | "vencord+equicord" | "shutcord" | "equicord";

const SOURCES: { value: Source; label: string; }[] = [
    { value: "vencord", label: "Vencord" },
    { value: "vencord+equicord", label: "Vencord + Equicord" },
    { value: "shutcord", label: "Shutcord" },
    { value: "equicord", label: "Equicord" }
];

const inSource = (origin: PluginOrigin, source: Source) =>
    source === "vencord+equicord" ? origin !== "shutcord" : origin === source;

function ExcludedPluginsList({ search }: { search: string; }) {
    const matchingExcludedPlugins = search
        ? Object.entries(ExcludedPlugins)
            .filter(([name]) => name.toLowerCase().includes(search))
        : [];

    const ExcludedReasons: Record<PluginTarget, string> = {
        desktop: "Discord Desktop app or Vesktop",
        discordDesktop: "Discord Desktop app",
        vesktop: "Vesktop app",
        web: "Vesktop app and the Web version of Discord",
        dev: "Developer version of Shutcord",
        browser: "Web Browser version of Shutcord"
    };

    return (
        <Paragraph className={Margins.top16}>
            {matchingExcludedPlugins.length
                ? <>
                    <Paragraph>Are you looking for:</Paragraph>
                    <ul>
                        {matchingExcludedPlugins.map(([name, reason]) => (
                            <li key={name}>
                                <b>{name}</b>: Only available on the {ExcludedReasons[reason]}
                            </li>
                        ))}
                    </ul>
                </>
                : "No plugins meet the search criteria."
            }
        </Paragraph>
    );
}

function PluginSettings() {
    const settings = useSettings();
    const changeRef = useRef<ChangeList<string>>(null);
    const changes = changeRef.current ??= new ChangeList<string>();

    useCleanupEffect(() => {
        if (changes.hasChanges)
            promptToRestart("reload", {
                children: <>
                    <Heading className={Margins.bottom8}>The following plugins require a restart:</Heading>
                    <Paragraph>{Array.from(changes, k => k.split(".")[0]).join(", ")}</Paragraph>
                </>
            });
    }, []);

    const depMap = useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const sortedPlugins = useMemo(() =>
        Object.values(Plugins).sort((a, b) => a.name.localeCompare(b.name)),
        []
    )
        .toSorted((a, b) => Number(settings.plugins[b.name]?.isFavorite ?? false) - Number(settings.plugins[a.name]?.isFavorite ?? false));

    const [searchValue, setSearchValue] = useState({ value: "", tags: [] as PluginTag[], source: "vencord+equicord" as Source });

    const search = searchValue.value.toLowerCase();
    const onSearch = (query: string) => setSearchValue(prev => ({ ...prev, value: query }));

    const pluginFilter = (plugin: typeof Plugins[keyof typeof Plugins]) => {
        const { tags } = searchValue;

        if (tags.length && tags.some(t => !plugin.tags?.includes(t))) return false;

        if (!search.length) return true;

        return (
            plugin.name.toLowerCase().includes(search) ||
            plugin.name.match(/[A-Z]/g)?.join("").toLowerCase().includes(search) || // acronyms like BF for BetterFolders
            plugin.description.toLowerCase().includes(search) ||
            plugin.searchTerms?.some(t => t.toLowerCase().includes(search))
        );
    };

    const [newPlugins] = useAwaiter(() => DataStore.get("Shutcord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
        const now = Date.now() / 1000;
        const existingTimestamps: Record<string, number> = {};
        const sortedPluginNames = Object.values(sortedPlugins).map(plugin => plugin.name);

        const newPlugins: string[] = [];
        for (const { name: p } of sortedPlugins) {
            const time = existingTimestamps[p] = cachedPlugins?.[p] ?? now;
            if ((time + 60 * 60 * 24 * 2) > now) {
                newPlugins.push(p);
            }
        }
        DataStore.set("Shutcord_existingPlugins", existingTimestamps);

        return lodash.isEqual(newPlugins, sortedPluginNames) ? [] : newPlugins;
    }));

    const enabledPlugins = [] as JSX.Element[];
    const customPlugins = [] as JSX.Element[];
    const plugins = [] as JSX.Element[];
    const requiredPlugins = [] as JSX.Element[];
    const sourceCounts: Record<PluginOrigin, number> = { vencord: 0, equicord: 0, shutcord: 0 };

    const makeCard = (p: typeof sortedPlugins[number]) => (
        <PluginCard
            onRestartNeeded={(name, key) => changes.handleChange(`${name}.${key}`)}
            disabled={false}
            plugin={p}
            isNew={newPlugins?.includes(p.name)}
            key={p.name}
        />
    );

    for (const p of sortedPlugins) {
        if (p.hidden || (!p.settings && p.name.endsWith("API")))
            continue;

        if (!pluginFilter(p)) continue;

        const origin = getPluginOrigin(p);
        sourceCounts[origin]++;

        const isRequired = p.required || p.isDependency || depMap[p.name]?.some(d => settings.plugins[d].enabled);

        if (isRequired) {
            const tooltipText = p.required || !depMap[p.name]
                ? "This plugin is required for Shutcord to function."
                : makeDependencyList(depMap[p.name]?.filter(d => settings.plugins[d].enabled));

            requiredPlugins.push(
                <Tooltip text={tooltipText} key={p.name}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <PluginCard
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            onRestartNeeded={(name, key) => changes.handleChange(`${name}.${key}`)}
                            disabled={true}
                            plugin={p}
                            key={p.name}
                        />
                    )}
                </Tooltip>
            );
        } else if (PluginMeta[p.name]?.userPlugin) {
            customPlugins.push(makeCard(p));
        } else if (isPluginEnabled(p.name)) {
            enabledPlugins.push(makeCard(p));
        } else if (inSource(origin, searchValue.source)) {
            plugins.push(makeCard(p));
        }
    }

    return (
        <SettingsTab>
            {changes.hasChanges && <ReloadRequiredCard />}

            <ErrorBoundary noop>
                <TextInput
                    inputClassName={cl("filter-control")}
                    placeholder="Search for a plugin..."
                    value={searchValue.value}
                    onChange={onSearch}
                    autoFocus
                />
            </ErrorBoundary>

            <ErrorBoundary noop>
                <div className={classes(Margins.top8, cl("source-row"))}>
                    {SOURCES.map(({ value, label }) => {
                        const count = Object.entries(sourceCounts)
                            .reduce((n, [origin, c]) => n + (inSource(origin as PluginOrigin, value) ? c : 0), 0);
                        return (
                            <Button
                                key={value}
                                variant={searchValue.source === value ? "primary" : "secondary"}
                                onClick={() => setSearchValue(prev => ({ ...prev, source: value }))}
                            >
                                {label} ({count})
                            </Button>
                        );
                    })}
                </div>
                <div className={classes(Margins.bottom20, Margins.top8, cl("filter-controls"))}>
                    <SearchableSelect
                        options={PluginTags.map(tag => ({ label: tag, value: tag }))}
                        value={searchValue.tags}
                        onChange={tags => setSearchValue(prev => ({ ...prev, tags }))}
                        closeOnSelect={false}
                        placeholder="Filter by Tags"
                        multi
                    />
                </div>
            </ErrorBoundary>

            <Heading tag="h4" className={Margins.top20}>Enabled plugins ({enabledPlugins.length})</Heading>
            <div className={cl("grid")}>
                {enabledPlugins.length
                    ? enabledPlugins
                    : <Paragraph>{search || searchValue.tags.length ? "No enabled plugins meet the search criteria." : "Nothing enabled yet. Turn a plugin on below."}</Paragraph>
                }
            </div>

            <Heading tag="h4" className={classes(Margins.top20, Margins.bottom8)}>Custom plugins ({customPlugins.length})</Heading>
            <div className={cl("grid")}>
                {customPlugins.length
                    ? customPlugins
                    : <Paragraph>Your own plugins show up here. Put them in <code>src/userplugins</code> when building Shutcord from source.</Paragraph>
                }
            </div>

            <Heading tag="h4" className={classes(Margins.top20, Margins.bottom8)}>Plugins ({plugins.length})</Heading>

            {plugins.length || enabledPlugins.length || customPlugins.length || requiredPlugins.length
                ? (
                    <div className={cl("grid")}>
                        {plugins.length
                            ? plugins
                            : <Paragraph>{searchValue.source === "equicord" ? "No Equicord plugins are bundled yet." : "No more plugins meet the search criteria."}</Paragraph>
                        }
                    </div>
                )
                : <ExcludedPluginsList search={search} />
            }

            <Divider className={Margins.top20} />

            <Heading tag="h4" className={classes(Margins.top20, Margins.bottom8)}>
                Required Plugins
            </Heading>

            <div className={cl("grid")}>
                {requiredPlugins.length
                    ? requiredPlugins
                    : <Paragraph>No plugins meet the search criteria.</Paragraph>
                }
            </div>

            <UIElementsButton />
        </SettingsTab >
    );
}

function makeDependencyList(deps: string[]) {
    return (
        <>
            <Paragraph>This plugin is required by:</Paragraph>
            {deps.map((dep: string) => <Paragraph key={dep} className={cl("dep-text")}>{dep}</Paragraph>)}
        </>
    );
}

export default wrapTab(PluginSettings, "Plugins");
