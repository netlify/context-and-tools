# Changelog

All notable changes to this project are documented here. From v0.8.0 onward this
file is maintained automatically by [release-please](https://github.com/googleapis/release-please).
Versions v0.1.0–v0.8.0 were backfilled from the project's history.

## [0.12.1](https://github.com/netlify/context-and-tools/compare/v0.12.0...v0.12.1) (2026-07-09)


### Bug Fixes

* **skills:** consolidate deploy skills into a single netlify-deploy (AX-108) ([#89](https://github.com/netlify/context-and-tools/issues/89)) ([129b350](https://github.com/netlify/context-and-tools/commit/129b35035b1c68922e4a17a4052cbd579adbfd6b))


### Documentation

* **skills:** rehome env-var CLI management into netlify-config (AX-108) ([#87](https://github.com/netlify/context-and-tools/issues/87)) ([2ec71b6](https://github.com/netlify/context-and-tools/commit/2ec71b640ba20e10c39a8326385d3d1241261d8d))
* **skills:** rehome local dev guidance into netlify-frameworks (AX-108) ([#88](https://github.com/netlify/context-and-tools/issues/88)) ([e63c778](https://github.com/netlify/context-and-tools/commit/e63c7787ebc16a3d6680fa4ce8611d2aacb6bb4d))

## [0.12.0](https://github.com/netlify/context-and-tools/compare/v0.11.0...v0.12.0) (2026-07-07)


### Features

* **skills:** full footgun hardening across all domains — skill guidance + scenarios (AX-106) ([#84](https://github.com/netlify/context-and-tools/issues/84)) ([9522896](https://github.com/netlify/context-and-tools/commit/9522896a5812b516ce34e785da071969fc474834))


### Bug Fixes

* **axis:** reconcile over-tested judge checks with skill facts (AX-104) ([#82](https://github.com/netlify/context-and-tools/issues/82)) ([b2de7c1](https://github.com/netlify/context-and-tools/commit/b2de7c126ebf9ed80519256e423f00f0e4472ec0))
* **skills:** correct factual errors in caching, ai-gateway, deploy, forms, cli, functions, and frameworks skills ([#81](https://github.com/netlify/context-and-tools/issues/81)) ([8f49f34](https://github.com/netlify/context-and-tools/commit/8f49f347107af7e447ebc1dcac6cbd2039d925ad))


### Documentation

* **skills:** duplicate cross-cutting rules into domain skills that lack them ([#83](https://github.com/netlify/context-and-tools/issues/83)) ([681f4d8](https://github.com/netlify/context-and-tools/commit/681f4d81d81ecdee008b9adbd157fab8fd62ea79))

## [0.11.0](https://github.com/netlify/context-and-tools/compare/v0.10.0...v0.11.0) (2026-07-06)


### Features

* **skills:** clarify Netlify Identity vs access control, harden OAuth guidance ([#58](https://github.com/netlify/context-and-tools/issues/58)) ([fce2a2f](https://github.com/netlify/context-and-tools/commit/fce2a2fd13fa32a9d6a9b603634c2c26cd95f2e5))

## [0.10.0](https://github.com/netlify/context-and-tools/compare/v0.9.0...v0.10.0) (2026-07-02)


### Features

* **skills:** surface-and-stop guidance for blobs/deploy + cross-cutting AXIS scenarios ([#74](https://github.com/netlify/context-and-tools/issues/74)) ([20258f3](https://github.com/netlify/context-and-tools/commit/20258f30e2985f3f540d5f3875cc48eeeeb67764))


### Bug Fixes

* **axis:** correct scenario judges that contradict their skills ([#65](https://github.com/netlify/context-and-tools/issues/65)) ([37f9465](https://github.com/netlify/context-and-tools/commit/37f94653535516be43b8c64b555ae887c64bb8a4))
* **axis:** reconcile Drizzle migration timestamp prefix with skill ([#64](https://github.com/netlify/context-and-tools/issues/64)) ([42850fb](https://github.com/netlify/context-and-tools/commit/42850fb9fc323864a2472202121de5a16c629732))
* **deps:** update dependency @netlify/database to ^1.1.0 ([#76](https://github.com/netlify/context-and-tools/issues/76)) ([b2ac576](https://github.com/netlify/context-and-tools/commit/b2ac576480c3e9a14c3e660c43ba911d1a257dff))
* **deps:** update dependency @netlify/neon to ^0.1.2 ([#77](https://github.com/netlify/context-and-tools/issues/77)) ([9fdeb6b](https://github.com/netlify/context-and-tools/commit/9fdeb6b8dd2a94f22e049af38c6ef09aff822284))
* **skills:** clarify Identity getUser server-side and email-change docs ([#66](https://github.com/netlify/context-and-tools/issues/66)) ([9e17494](https://github.com/netlify/context-and-tools/commit/9e17494fa327361a2f232db533fd0ead3648b3c1))
* **skills:** correct AI Gateway, caching, Next.js, and TanStack doc errors ([#62](https://github.com/netlify/context-and-tools/issues/62)) ([1e6e434](https://github.com/netlify/context-and-tools/commit/1e6e4343365541001722f7e88f72a580ec3a7a7c))
* **skills:** update Astro skill for Astro 5 output modes ([#63](https://github.com/netlify/context-and-tools/issues/63)) ([255ee17](https://github.com/netlify/context-and-tools/commit/255ee17ebb3e9706e48ac8a722aafb8b08c26631))


### Documentation

* **axis:** add internal contributor guide for AXIS ([#68](https://github.com/netlify/context-and-tools/issues/68)) ([8abcd8b](https://github.com/netlify/context-and-tools/commit/8abcd8b6e16225abd406e8cf83060763293485a8))

## [0.9.0](https://github.com/netlify/context-and-tools/compare/v0.8.0...v0.9.0) (2026-06-29)


### Features

* add netlify-mcp-servers skill ([#44](https://github.com/netlify/context-and-tools/issues/44)) ([054b260](https://github.com/netlify/context-and-tools/commit/054b260350e3e5d12d7d050766246db9f958f1c3))

## [0.8.0](https://github.com/netlify/context-and-tools/releases/tag/v0.8.0) (2026-06-24)

Agent-optimized Netlify Functions guidance and the remote agent-runner skill.

- Agent-optimized Functions capabilities across skills: per-function memory/vCPU config, per-function region pinning, deploy event handlers, and modern Identity event handlers (signup role assignment, deny) (#38)
- netlify-agent-runner skill for remote AI agent tasks (#22)
- One-shot update guidance and clearer agent handoffs (#31)

## [0.7.0](https://github.com/netlify/context-and-tools/releases/tag/v0.7.0) (2026-06-11)

A new platform target and a bundled Netlify MCP server.

- Grok Build (xAI) plugin support (#49)
- Bundled the official Netlify MCP server (#50), then switched to the hosted HTTP endpoint (#51)
- AXIS eval scenarios for skills (#40–#43, #47)
- Copilot CLI installation instructions (#34)
- AI Gateway image-generation fixes (#25)
- netlify-database CLI reference moved into references/ to fit the token budget

## [0.6.0](https://github.com/netlify/context-and-tools/releases/tag/v0.6.0) (2026-04-30)

The GA managed Postgres skill lands, plus tooling to author skills.

- netlify-database skill for GA managed Postgres (#23) with command hotfixes (#24)
- skill-creator skill (#26)
- Agent-runner first-identity-admin setup guidance (#20, #21)
- Codex CLI installation instructions

## [0.5.0](https://github.com/netlify/context-and-tools/releases/tag/v0.5.0) (2026-03-31)

A new identity skill plus CI to keep skills valid.

- netlify-identity skill (#12)
- Skill-validation CI workflow (#18)
- Forms skill: SSR guidance and fetch-URL fixes (#13, #16)
- Agent runners: supported AI Gateway models documented (#14)

## [0.4.0](https://github.com/netlify/context-and-tools/releases/tag/v0.4.0) (2026-02-27)

Gallery/marketplace distribution and a new editor target.

- Gemini CLI extension manifest for gallery listing
- Marketplace submission updates (#9)

## [0.3.0](https://github.com/netlify/context-and-tools/releases/tag/v0.3.0) (2026-02-19)

Skills became installable across multiple AI coding tools.

- netlify-deploy skill (#3)
- Claude Code plugin marketplace structure
- Cursor support via auto-generated .mdc rules (#6)
- Codex distribution layer with a generated AGENTS.md router (#7)
- README install commands and marketplace.json source-format fixes (#4)

## [0.2.0](https://github.com/netlify/context-and-tools/releases/tag/v0.2.0) (2026-02-17)

First public set of Netlify platform skills for AI coding agents.

- Public Netlify skills covering core platform primitives (#2)

## [0.1.0](https://github.com/netlify/context-and-tools/releases/tag/v0.1.0) (2025-11-28)

The repository's origin: steering context for deploying to Netlify from Kiro.

- POWER.md steering guide with front matter for Kiro deployments (#1)
