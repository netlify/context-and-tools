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

The Claude Code and Grok Build plugins (and the Gemini CLI extension) also register the [official Netlify MCP server](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/), giving the agent tools to create and manage Netlify projects, deploys, and environment variables — not just the reference skills.

It connects to Netlify's hosted server over HTTP (`https://netlify-mcp.netlify.app/mcp`) and authorizes via OAuth on first use — no token or local install required. The rules-based integrations (Cursor, Codex, Copilot) don't bundle the MCP server — add it to those clients manually using the [Netlify MCP docs](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/).

### Other AI agents

Each `SKILL.md` file is a self-contained reference with YAML frontmatter (`name` and `description`) and markdown body. Feed them into any agent's context as needed.

## Design Principles

- **Factual, not opinionated** — platform behavior and API reference, not workflow preferences
- **Composable** — skills cover individual primitives; agents combine them as needed
- **Concise** — each SKILL.md stays under 500 lines; detailed content goes in `references/`
- **Current** — covers modern Netlify patterns (v2 functions, Vite plugin, AI Gateway)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit/PR title conventions and how releases are cut.

Keep skills focused on Netlify platform primitives. Each skill should answer "how does this Netlify feature work?" rather than "how should I structure my project?"

Follow the existing format: YAML frontmatter with `name` and `description`, markdown body, code examples with TypeScript where applicable. Use `references/` subdirectories for content that would push a SKILL.md past 500 lines.

### Cursor rules and Codex skills are generated — do not edit them directly

The `cursor/rules/` and `codex/` directories are auto-generated from `skills/` by a GitHub Actions workflow. Always edit the source files in `skills/`. On same-repo PRs and on every push to `main` that changes `skills/`, the workflow rebuilds the mirrors and commits them alongside your change — you don't need to run the build yourself. (Fork PRs can't be committed to automatically; include the regenerated output in your PR, or a maintainer will regenerate it.) To preview locally:

```bash
bash scripts/build-cursor-rules.sh
bash scripts/build-codex-skills.sh
```
