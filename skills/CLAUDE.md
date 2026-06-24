# Netlify Skills

This project deploys on Netlify. Use these skills for guidance on Netlify platform primitives. Each skill provides specific, factual reference for working with a Netlify feature.

## When to Use Each Skill

**Building API endpoints or server-side logic?**
Read `netlify-functions/SKILL.md` for modern function syntax, routing, background/scheduled functions.

**Need low-latency middleware, geo-based logic, or request manipulation?**
Read `netlify-edge-functions/SKILL.md` for edge compute patterns.

**Storing files, images, or other assets?**
Read `netlify-blobs/SKILL.md` for object storage API. Blobs is for file/asset storage only — not for dynamic data.

**Need to store any dynamic, structured, or relational data?**
Read `netlify-database/SKILL.md` for Netlify Database — the GA managed Postgres product with Drizzle ORM, migrations, and preview branching.

**Optimizing or transforming images?**
Read `netlify-image-cdn/SKILL.md` for the image transformation endpoint and clean URL patterns. For user-uploaded images, see `netlify-image-cdn/references/user-uploads.md`.

**Adding HTML forms?**
Read `netlify-forms/SKILL.md` for form detection, AJAX submissions, spam filtering, and file uploads.

**Configuring netlify.toml (redirects, headers, build settings)?**
Read `netlify-config/SKILL.md` for the complete configuration reference.

**Deploying, managing env vars, or running local dev?**
Read `netlify-cli-and-deploy/SKILL.md` for CLI commands, Git vs manual deploys, and environment variable management.

**Setting up a framework (Vite, Astro, TanStack, Next.js)?**
Read `netlify-frameworks/SKILL.md` for adapter/plugin setup. Framework-specific details are in `netlify-frameworks/references/`.

**Controlling CDN caching behavior?**
Read `netlify-caching/SKILL.md` for cache headers, stale-while-revalidate, cache tags, and purge.

**Adding AI capabilities, choosing an AI model, or generating images with AI?**
Read `netlify-ai-gateway/SKILL.md` for AI Gateway setup, supported models, provider SDKs, and image generation (text-to-image and image-to-image via Gemini).

**Adding user authentication, signups, logins, or access control?**
Read `netlify-identity/SKILL.md` for Netlify Identity setup, OAuth, role-based access, and protecting routes and functions.

**Deploying a site to Netlify?**
Read `netlify-deploy/SKILL.md` for the full deployment workflow — authentication, site linking, preview and production deploys.

**Want to run AI agents (Claude, Codex, Gemini) remotely on your site?**
Read `netlify-agent-runner/SKILL.md` for creating, listing, and managing remote agent tasks.

## General Rules

- Use `Netlify.env.get("VAR")` for environment variables in functions (not `process.env`)
- Never hardcode secrets — use Netlify environment variables
- Add `.netlify` to `.gitignore`
- For framework-specific patterns, check the framework reference before writing custom Netlify Functions — the adapter may handle it

## Use only documented Netlify CLI surfaces

The supported way to interact with Netlify is the documented `netlify` CLI. Stay on it. "Documented CLI surfaces" means commands covered by these skills, `netlify --help`, or the public CLI reference — not direct API calls, config-file tokens, or undocumented endpoints. Specifically:

- **Do not call `https://api.netlify.com/...` directly** via `curl` or `fetch`. Endpoint shapes are not part of the public contract.
- **Do not read auth tokens** out of `~/Library/Preferences/netlify/config.json` (or anywhere else on disk) to authenticate side-channel calls.
- **Do not run raw clients** — `psql`, `redis-cli`, etc. — against managed Netlify services like Netlify Database, even for "harmless" read-only queries. Use the CLI's documented query surfaces (e.g., `netlify database connect --query "..."`).
- **Dashboard-only operations** (Identity instance enablement, external OAuth providers, custom domains) get handed to the user with the dashboard URL. There is no undocumented API to probe.

The `netlify api <method>` command is a thin wrapper over the API and is documented, but it is **not** a recovery hatch for failed happy paths — see the next rule.

## When a happy path fails, surface and stop

When a documented CLI command, deploy, or extension fails, first follow any explicit recovery step in the relevant skill. If the skill has no recovery step, or the documented recovery also fails, **report the failure to the user with context** (deploy log URL, the exact error, the site/branch involved) and stop. Do not work around it.

Specifically: do not invent recovery commands, do not run `netlify api <method>` to manually create or delete a resource the platform was supposed to provision, do not switch to a different tool to do the same thing the failing command was trying to do. A stuck agent that surfaces the right context is far safer than a "helpful" agent that wanders off and inadvertently deletes a database or site.

If the platform happy path is broken, that's a platform-state problem the user needs to see.

## Clarify before scaffolding

When a single user prompt implies multiple primitives (auth + database + payments + framework choice), ask 2–4 targeted questions before writing code, focused on decisions where defaults could leak data or cause rework (public vs private access, OAuth providers, signup mode, schema shape). Only ask the questions whose answers aren't already in the prompt — this is a light touch, not an interview. Always offer an outlet: "if you don't have preferences, tell me what you want overall and I'll pick sensible defaults." Per-skill question sets live in each affected SKILL.md.
