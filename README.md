# Netlify Context and Tools

Public Netlify skills for AI coding agents. Each skill is a focused, factual reference for a Netlify platform primitive — designed to help agents build correctly on Netlify without needing to search docs.

## Skills

| Skill | What it covers |
|---|---|
| [netlify-functions](skills/netlify-functions/SKILL.md) | Serverless functions — modern syntax, routing, background/scheduled/streaming |
| [netlify-edge-functions](skills/netlify-edge-functions/SKILL.md) | Edge compute — Deno runtime, middleware, geolocation |
| [netlify-blobs](skills/netlify-blobs/SKILL.md) | Object storage — key-value and binary data |
| [netlify-database](skills/netlify-database/SKILL.md) | Managed Postgres (Neon) with Drizzle ORM and migrations |
| [netlify-image-cdn](skills/netlify-image-cdn/SKILL.md) | Image transformation and optimization via CDN |
| [netlify-forms](skills/netlify-forms/SKILL.md) | HTML form handling, AJAX submissions, spam filtering |
| [netlify-config](skills/netlify-config/SKILL.md) | `netlify.toml` — redirects, headers, build settings, deploy contexts, environment variables |
| [netlify-frameworks](skills/netlify-frameworks/SKILL.md) | Framework adapters for Vite, Astro, TanStack, and Next.js |
| [netlify-caching](skills/netlify-caching/SKILL.md) | CDN cache control, cache tags, purge, stale-while-revalidate |
| [netlify-ai-gateway](skills/netlify-ai-gateway/SKILL.md) | AI Gateway proxy for OpenAI, Anthropic, and Google SDKs |
| [netlify-identity](skills/netlify-identity/SKILL.md) | User authentication — signups, logins, OAuth, role-based access control |
| [netlify-deploy](skills/netlify-deploy/SKILL.md) | CLI install/auth, site linking, Git-based and manual deploys, CI deploys, deploy troubleshooting |
| [netlify-access-control](skills/netlify-access-control/SKILL.md) | Protecting sites and previews — password protection, team-only access, visibility defaults, SSO |
| [netlify-agent-runner](skills/netlify-agent-runner/SKILL.md) | Running Claude, Codex, or Gemini agent tasks remotely against a site's repo |
| [netlify-mcp-servers](skills/netlify-mcp-servers/SKILL.md) | MCP servers on Netlify Functions — transport, authentication, connecting clients |

### References

Some skills include `references/` subdirectories with deeper content:

- [User-uploaded images pipeline](skills/netlify-image-cdn/references/user-uploads.md) — composing Functions + Blobs + Image CDN
- [Vite on Netlify](skills/netlify-frameworks/references/vite.md)
- [Astro on Netlify](skills/netlify-frameworks/references/astro.md)
- [TanStack Start on Netlify](skills/netlify-frameworks/references/tanstack.md)
- [Next.js on Netlify](skills/netlify-frameworks/references/nextjs.md)
- [Advanced identity patterns](skills/netlify-identity/references/advanced-patterns.md) — external providers, role-based access, server-side validation
- [CLI commands reference](skills/netlify-deploy/references/cli-commands.md)
- [Deployment patterns](skills/netlify-deploy/references/deployment-patterns.md)
- [netlify.toml guide](skills/netlify-deploy/references/netlify-toml.md)

## Installation

### Codex Desktop App

Install the Netlify plugin from the [Codex plugin directory](https://developers.openai.com/codex/plugins/) in the Codex desktop app.

The plugin lets Codex deploy to Netlify without leaving your coding workflow. You can create projects, generate preview URLs, deploy to production, validate build configuration, and inspect deploy status and logs. For full details, refer to [Deploy from Codex with the Netlify Plugin](https://www.netlify.com/changelog/2026-03-27-deploy-from-codex-netlify-plugin/).

### Codex CLI

Copy the pre-built `codex/` directory into your project root:

```bash
git clone --depth 1 https://github.com/netlify/context-and-tools.git /tmp/netlify-skills && \
  cp -r /tmp/netlify-skills/codex . && \
  rm -rf /tmp/netlify-skills
```

This gives you `codex/AGENTS.md` (the skill router) and `codex/skills/` with all Netlify skills. Codex discovers `AGENTS.md` automatically and activates skills by name using `$skill-name` syntax.

### GitHub Copilot CLI

Copy the pre-built `codex/` directory into your project root, then point Copilot CLI at it:

```bash
git clone --depth 1 https://github.com/netlify/context-and-tools.git /tmp/netlify-skills && \
  cp -r /tmp/netlify-skills/codex . && \
  rm -rf /tmp/netlify-skills
```

```bash
export COPILOT_CUSTOM_INSTRUCTIONS_DIRS="$PWD/codex"
```

Copilot CLI reads `AGENTS.md` from any directory listed in `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` and uses it as a router into the skill files under `codex/skills/`. Add the export to your shell profile to persist across sessions.

### Claude Code

Add the marketplace and install the plugin:

```
/plugin marketplace add netlify/context-and-tools
/plugin install netlify-skills@netlify-context-and-tools
```

This installs all Netlify skills into Claude Code. The included `skills/CLAUDE.md` acts as a router — it tells the agent which skill to read based on what you're building.

### VS Code

VS Code's [agent plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins) use the same plugin format as Claude Code, so VS Code installs the skills directly from this repository — no separate build step or generated output. VS Code auto-detects the plugin from `.claude-plugin/plugin.json` and loads the `skills/` directory and the bundled Netlify MCP server (`.mcp.json`).

Add this repository as a plugin marketplace, then install:

1. Add the marketplace source `netlify/context-and-tools` to the `chat.plugins.marketplaces` setting.
2. Open the Extensions view, search `@agentPlugins`, find **netlify-skills**, and click **Install**.

Or install directly from source via the command palette: `Cmd+Shift+P` / `Ctrl+Shift+P` → **Chat: Install Plugin From Source** → enter `https://github.com/netlify/context-and-tools.git`.

### Cursor

Install from the [Cursor plugin marketplace](https://cursor.com/marketplace):

1. Open Cursor Settings (`Cmd+,` / `Ctrl+,`)
2. Go to **Plugins**
3. Search for **netlify-skills**
4. Click **Install**

Or install via the command palette: `Cmd+Shift+P` → **Plugins: Install Plugin** → search **netlify-skills**.

This installs 21 `.mdc` rule files covering all Netlify platform primitives. A router rule (`netlify-skills-router.mdc`) is always active and directs the agent to the right skill for the task.

<details>
<summary>Manual installation (without the plugin marketplace)</summary>

Copy pre-built rule files directly into your project:

```bash
git clone --depth 1 https://github.com/netlify/context-and-tools.git /tmp/netlify-skills && \
  mkdir -p .cursor/rules && \
  cp /tmp/netlify-skills/cursor/rules/*.mdc .cursor/rules/ && \
  rm -rf /tmp/netlify-skills
```

This copies `.mdc` rule files into `.cursor/rules/`, where Cursor automatically discovers them.

</details>



### Grok Build

Netlify is listed in the [official xAI plugin marketplace](https://github.com/xai-org/plugin-marketplace). In Grok Build, open the extensions modal (`/plugins`) and use the **Marketplace** tab to find and install **netlify**.

Grok Build uses the same plugin format as Claude Code, so it installs all Netlify skills directly from this repository — no separate build step or generated output. Marketplace sources live in `~/.grok/config.toml` under `[[marketplace.sources]]`; if the xAI marketplace isn't already configured, add it there. See the [xAI Skills, Plugins & Marketplaces docs](https://docs.x.ai/build/features/skills-plugins-marketplaces) for details.

### Netlify MCP server

The Claude Code, VS Code, and Grok Build plugins (and the Gemini CLI extension) also register the [official Netlify MCP server](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/), giving the agent tools to create and manage Netlify projects, deploys, and environment variables — not just the reference skills.

It connects to Netlify's hosted server over HTTP (`https://netlify-mcp.netlify.app/mcp`) and authorizes via OAuth on first use — no token or local install required. The rules-based integrations (Cursor, Codex, Copilot) don't bundle the MCP server — add it to those clients manually using the [Netlify MCP docs](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/).

### Other AI agents

Each `SKILL.md` file is a self-contained reference with YAML frontmatter (`name` and `description`) and markdown body. Feed them into any agent's context as needed.

## Hosted skills, manifest, and npm

Every release publishes the skills to two places you can consume without cloning this repo:

- **Hosted:** `https://netlify-skills.netlify.app` — `manifest.json` and `skills/<name>/<file>` for the latest release, `versions.json` listing every published version, and immutable copies at `v/<version>/…`.
- **npm:** [`@netlify/skills`](https://www.npmjs.com/package/@netlify/skills) — every skill plus `manifest.json` and the `netlify-skills` command, which installs single skills out of the package.

Skill files under `v/<version>/` are exact `git archive` bytes of the tag and never change. Each `v/<version>/manifest.json` is regenerated on publish, but its `tree_hash` formula is frozen for `schema_version: 1`, so a pinned hash stays valid.

The manifest is the contract every client syncs against. It lists each skill's name, status (`active` or `deprecated`), its own `version`, prior names, description, a per-file SHA-256, and a `tree_hash` over path, executable bit, and content that changes whenever any file in the skill changes, so "am I stale?" is one hash comparison.

Skills change independently, so each carries its own version: the release in which its files last changed. The set might be at 1.6.0 while `netlify-functions` is still at 1.4.2 because nothing in it has moved since. Pin a skill by its own version: `v/1.4.2/skills/netlify-functions/…`. Nobody maintains these by hand; they are derived from git tags at publish time.

```bash
# Latest manifest
curl -s https://netlify-skills.netlify.app/manifest.json | head -c 600

# One skill, pinned to a version
curl -s https://netlify-skills.netlify.app/v/1.3.2/skills/netlify-functions/SKILL.md
```

### Install skills and keep them current

The `netlify-skills` command ships inside `@netlify/skills`. By default it installs skills out of the package it came with, so `npx @netlify/skills@latest` is a complete, offline-after-fetch install of the newest release, and pinning is picking the package version (`npx @netlify/skills@1.3.2 add …`). Every file is hash-verified against the bundled manifest. No clone needed:

```bash
# One or more skills into .claude/skills (the default); `functions` works for `netlify-functions`
npx @netlify/skills@latest add netlify-functions blobs

# Every skill
npx @netlify/skills@latest add --all

# Pin a skill to its own version
npx @netlify/skills@latest add netlify-functions --version 1.3.0

# What state are my installed skills in? (`status` works too.) Exits 1 if update would change anything.
npx @netlify/skills@latest check

# Bring them up to date from this package's release
npx @netlify/skills@latest update

# Or reconcile against the hosted manifest (the newest release, whatever package version is running)
npx @netlify/skills@latest update --remote
```

Use `@latest` with `npx`: it otherwise reuses whatever version it cached last time, and the release you install from should be the newest one. `--remote` reads the hosted manifest instead of the bundled one, which is what the Netlify CLI and MCP do; `--host <url>` names a different hosted location, and `--version` applies to the hosted path.

`check` (or `status`) classifies each installed skill: `current`, `stale (have 1.2.0, latest is 1.3.0)`, `modified` (edited locally), `renamed`, `deprecated`, `duplicate` (one of our skills copied under another name), or `unknown` (yours, never touched), and lists what is `missing`. With `--json` this is what an orchestrator such as Agent Runners reads before injecting skills into a repo, so it adds only what is absent and never overwrites or duplicates. `update` replaces stale copies, migrates renamed ones, deletes deprecated ones, and leaves edited copies alone unless you pass `--reset`. It adds missing skills only with `--all`, so a single-skill install stays single. The manifest's per-skill `history` (every release a skill changed at, with its hash) is what lets it tell "outdated" from "edited".

A service that reads skills programmatically (Agent Runners) can depend on the package and read one skill by path: `node_modules/@netlify/skills/skills/netlify-functions/SKILL.md`. The bundled `manifest.json` carries each skill's own version, so a service can tell which skills changed between two package versions without diffing files.

The same client is in this repo as `scripts/fetch-skill.mjs` (`--source <dir>` or `--host <url>`; `--skill`/`--all` with `--dest`, `--check`, `--update`), which is what the Netlify CLI's init and sync will build on. The whole-set package also ships the `skills/CLAUDE.md` router; the hosted site serves exactly the files the manifest lists, so the router is not there. Both targets are published from the release tag by `.github/workflows/publish.yml`.

## Design Principles

- **Factual, not opinionated** — platform behavior and API reference, not workflow preferences
- **Composable** — skills cover individual primitives; agents combine them as needed
- **Concise** — each SKILL.md stays under 500 lines; detailed content goes in `references/`
- **Current** — covers modern Netlify patterns (v2 functions, Vite plugin, AI Gateway)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit/PR title conventions and how releases are cut.

Keep skills focused on Netlify platform primitives. Each skill should answer "how does this Netlify feature work?" rather than "how should I structure my project?"

Follow the existing format: YAML frontmatter with `name` and `description`, markdown body, code examples with TypeScript where applicable. Use `references/` subdirectories for content that would push a SKILL.md past 500 lines.

### Generated outputs — do not edit them directly

The `cursor/rules/`, `codex/`, and `agent-plugin/skills/` directories, and the `skills` array in `gemini-extension.json`, are auto-generated from `skills/` by a GitHub Actions workflow. Always edit the source files in `skills/`. On same-repo PRs and on every push to `main` that changes `skills/`, the workflow rebuilds all of them and commits them alongside your change — you don't need to run the build yourself. (Fork PRs can't be committed to automatically; include the regenerated output in your PR, or a maintainer will regenerate it.) To preview locally:

```bash
bash scripts/build-cursor-rules.sh
bash scripts/build-codex-skills.sh
bash scripts/build-agent-plugin.sh
bash scripts/build-gemini-extension.sh
```
