# Changelog

All notable changes to this project are documented here. From v0.8.0 onward this
file is maintained automatically by [release-please](https://github.com/googleapis/release-please).
Versions v0.1.0–v0.8.0 were backfilled from the project's history.

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
