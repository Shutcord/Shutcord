# Shutcord

A Discord client mod. Home: https://github.com/Shutcord/Shutcord

Shutcord is a fork of [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors,
licensed under GPL-3.0-or-later. Original copyright notices are kept in the source files as the license requires.

## Features

-   100+ built in plugins
-   Fairly lightweight despite the many inbuilt plugins
-   Run Shutcord in your Browser via extension or UserScript
-   Works on any Discord branch: Stable, Canary or PTB all work
-   Custom CSS and Themes: Inbuilt css editor with support to import any css files (including BetterDiscord themes)
-   Privacy friendly: blocks Discord analytics & crash reporting out of the box and has no telemetry
-   Settings sync between devices (optional, needs a backend you host yourself)

## Building from source

```sh
pnpm install --frozen-lockfile
pnpm build            # desktop
pnpm buildWeb         # browser extension / userscript
pnpm inject           # patch your Discord install
```

Downloads: https://github.com/Shutcord/Shutcord/releases

Issues and discussions: https://github.com/Shutcord/Shutcord

## Sponsors

Thank you to everyone who supports Shutcord. Perks are listed in [docs/SPONSORS.md](docs/SPONSORS.md).

<!-- sponsors:start -->
<a href="https://github.com/shutted"><img src="https://github.com/shutted.png?size=64" width="48" height="48" alt="shutted" title="shutted"></a>
<!-- sponsors:end -->

## Disclaimer

Discord is trademark of Discord Inc. and solely mentioned for the sake of descriptivity.
Mention of it does not imply any affiliation with or endorsement by Discord Inc.

<details>
<summary>Using Shutcord violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine as long as you don’t use any plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is very important to you and it getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to Shutcord), just to be safe

Additionally, make sure not to post screenshots with Shutcord in a server where you might get banned for it

</details>
