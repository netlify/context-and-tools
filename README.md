# Netlify Context and Tools

Public Netlify skills for AI coding agents. Each skill is a focused, factual reference for a Netlify platform primitive — designed to help agents build correctly on Netlify without needing to search docs.

## Skills

| Skill | What it covers |
|---|---|
| [netlify-functions](skills/netlify-functions/SKILL.md) | Serverless functions — modern syntax, routing, background/scheduled/streaming |
| [netlify-edge-functions](skills/netlify-edge-functions/SKILL.md) | Edge compute — Deno runtime, middleware, geolocation |
| [netlify-blobs](skills/netlify-blobs/SKILL.md) | Object storage — key-value and binary data |
| [netlify-db](skills/netlify-db/SKILL.md) | Managed Postgres (Neon) with Drizzle ORM and migrations |
| [netlify-image-cdn](skills/netlify-image-cdn/SKILL.md) | Image transformation and optimization via CDN |
| [netlify-forms](skills/netlify-forms/SKILL.md) | HTML form handling, AJAX submissions, spam filtering |
| [netlify-config](skills/netlify-config/SKILL.md) | `netlify.toml` — redirects, headers, build settings, deploy contexts |
| [netlify-cli-and-deploy](skills/netlify-cli-and-deploy/SKILL.md) | CLI commands, Git vs manual deploys, environment variables |
| [netlify-frameworks](skills/netlify-frameworks/SKILL.md) | Framework adapters for Vite, Astro, TanStack, and Next.js |
| [netlify-caching](skills/netlify-caching/SKILL.md) | CDN cache control, cache tags, purge, stale-while-revalidate |
| [netlify-ai-gateway](skills/netlify-ai-gateway/SKILL.md) | AI Gateway proxy for OpenAI, Anthropic, and Google SDKs |

### References

Some skills include `references/` subdirectories with deeper content:

- [User-uploaded images pipeline](skills/netlify-image-cdn/references/user-uploads.md) — composing Functions + Blobs + Image CDN
- [Vite on Netlify](skills/netlify-frameworks/references/vite.md)
- [Astro on Netlify](skills/netlify-frameworks/references/astro.md)
- [TanStack Start on Netlify](skills/netlify-frameworks/references/tanstack.md)
- [Next.js on Netlify](skills/netlify-frameworks/references/nextjs.md)

## Installation

### Claude Code

Add the marketplace and install the plugin:

```
/plugin marketplace add netlify/context-and-tools
/plugin install netlify-skills@netlify-context-and-tools
```

This installs all Netlify skills into Claude Code. The included `skills/CLAUDE.md` acts as a router — it tells the agent which skill to read based on what you're building.

### Cursor

Add Netlify rules to your project:

```bash
git clone --depth 1 https://github.com/netlify/context-and-tools.git /tmp/netlify-skills && \
  mkdir -p .cursor/rules && \
  cp /tmp/netlify-skills/cursor/rules/*.mdc .cursor/rules/ && \
  rm -rf /tmp/netlify-skills
```

This copies pre-built `.mdc` rule files into `.cursor/rules/`, where Cursor automatically discovers them. A router rule (`netlify-skills-router.mdc`) is included to help the agent pick the right skill for the task.

### Other AI agents

Each `SKILL.md` file is a self-contained reference with YAML frontmatter (`name` and `description`) and markdown body. Feed them into any agent's context as needed.

## Design Principles

- **Factual, not opinionated** — platform behavior and API reference, not workflow preferences
- **Composable** — skills cover individual primitives; agents combine them as needed
- **Concise** — each SKILL.md stays under 500 lines; detailed content goes in `references/`
- **Current** — covers modern Netlify patterns (v2 functions, Vite plugin, AI Gateway)

## Contributing

Keep skills focused on Netlify platform primitives. Each skill should answer "how does this Netlify feature work?" rather than "how should I structure my project?"

Follow the existing format: YAML frontmatter with `name` and `description`, markdown body, code examples with TypeScript where applicable. Use `references/` subdirectories for content that would push a SKILL.md past 500 lines.

### Cursor rules are generated — do not edit them directly

The `cursor/rules/` directory is auto-generated from `skills/` by a GitHub Actions workflow. Always edit the source files in `skills/` — the workflow rebuilds Cursor rules on every push to `main` that changes `skills/`. To test locally, run:

```bash
bash scripts/build-cursor-rules.sh
```
