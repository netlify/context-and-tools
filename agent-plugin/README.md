# netlify-skills — Agent Plugin

An [Agent Plugins](https://agent-plugins.org) spec-compliant package (v1.0.0)
bundling Netlify platform skills and the official Netlify MCP server. Any
conformant Agent Plugins client (Cursor, and other clients from the TSC
ecosystem — Amazon, Microsoft, OpenAI, Vercel) can discover and load it.

## What's inside

```
agent-plugin/
├── plugin.json          # Required manifest (declares $schema + name)
├── mcp.json             # Netlify MCP server (hosted, streamable HTTP, OAuth at runtime)
├── skills/              # 15 Netlify platform skills (each with SKILL.md)
│   ├── netlify-deploy/
│   ├── netlify-functions/
│   ├── netlify-edge-functions/
│   └── ...
├── LICENSE
├── CHANGELOG.md
└── README.md
```

## Components

- **Skills** — Factual, framework-neutral reference for Netlify primitives:
  access control, agent runner, AI gateway, blobs, caching, config, database,
  deploy, edge functions, forms, frameworks, functions, identity, image CDN,
  and MCP servers. Each is a directory under `skills/` containing a `SKILL.md`
  (Agent Skills format).
- **MCP** — The official hosted Netlify MCP server
  (`https://netlify-mcp.netlify.app/mcp`, streamable HTTP). It authorizes via
  OAuth on first connection — no token or local install required — letting the
  agent create and manage Netlify projects, deploys, and environment variables.

## Regenerating

`skills/` is the source of truth for the whole repository. The `skills/` tree
in this package is mirrored from it. Rebuild with:

```bash
bash scripts/build-agent-plugin.sh
```

Do not edit `agent-plugin/skills/` directly — edit the top-level `skills/`
directory and rerun the build.

## Spec conformance notes

- `plugin.json` declares the required `$schema` and a `name` that satisfies the
  1–64 char, lowercase-alphanumeric-with-hyphens constraint.
- `mcp.json` `$schema` version matches `plugin.json`'s spec version (1.0.0), as
  required — a mismatch would disable MCP for the plugin.
- The MCP server uses `type: "streamable-http"` (the spec transport name) over
  HTTPS, with no user info, fragments, or non-portable fields.
- All paths resolve within the plugin root; nothing escapes the package
  boundary.
