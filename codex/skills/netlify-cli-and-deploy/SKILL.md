---
name: netlify-cli-and-deploy
description: Guide for using the Netlify CLI and deploying sites. Use when installing the CLI, linking sites, deploying (Git-based or manual), managing environment variables, or running local development. Covers netlify dev, netlify deploy, Git vs non-Git workflows, and environment variable management.
---

# Netlify CLI and Deployment

## Installation

```bash
npm install -g netlify-cli    # Global (for local dev)
npm install netlify-cli -D    # Local (for CI)
```

Requires Node.js 18.14.0+.

## Authentication

```bash
netlify login       # Opens browser for OAuth
netlify status      # Check auth + linked site status
```

For CI, set `NETLIFY_AUTH_TOKEN` environment variable instead.

**CI also needs a site to target.** `NETLIFY_AUTH_TOKEN` only authenticates you — it does **not** select which site a deploy publishes to. In CI there is no linked `.netlify/state.json`, so also set `NETLIFY_SITE_ID` (the site's API/Project ID, shown as **Project ID** in the site's configuration) as an environment variable so `netlify deploy` knows where to publish. Without it, a CI deploy has no site to target and fails or tries to prompt. Locally this is handled by `netlify link`, which writes the site ID into `.netlify/state.json`; CI has no such file.

## Linking a Site

Check if already linked with `netlify status`. If not:

```bash
# Interactive
netlify link

# By Git remote (if using Git)
netlify link --git-remote-url https://github.com/org/repo

# Create new site
netlify init           # With Git CI/CD setup
netlify init --manual  # Without Git CI/CD
```

Site ID is stored in `.netlify/state.json`. Add `.netlify` to `.gitignore`.

## Deploying

### Git-Based Deploys (Continuous Deployment)

Set up with `netlify init`. Automatic deploys trigger on push/PR:
- Push to production branch → production deploy
- Open PR → deploy preview with unique URL
- Push to other branches → branch deploy **only if branch deploys are enabled** — they are off by default; turn them on (per branch or for all branches) in the site's build & deploy settings

Build runs on Netlify's servers. Configure build settings in `netlify.toml`.

**`netlify.toml` overrides the UI.** File-based configuration in `netlify.toml` takes precedence over the equivalent build settings configured in the Netlify UI. When the same option is set in both places, the committed `netlify.toml` wins — editing that setting in the dashboard has no effect until you change the file and redeploy. This surprises people who tweak the build command, publish directory, or base directory in the UI and watch the old committed value keep applying on every deploy.

**Monorepo config discovery order.** In a monorepo, Netlify searches for the `netlify.toml` in this order and uses the **first** one it finds: (1) the package directory, then (2) the base directory, then (3) the repository root. Put a site-specific `netlify.toml` in the package directory (the subdirectory that contains that site) so it takes precedence over any root-level config. A base directory set in a root-level `netlify.toml` also overrides the base directory configured in the UI.

### Manual / Local Deploys (No Git Required)

Build locally, then upload:

```bash
netlify deploy          # Draft deploy (preview URL)
netlify deploy --prod   # Production deploy
netlify deploy --dir=dist  # Specify output directory
```

This works without Git — useful for prototypes, local-only projects, or CI pipelines.

**A manual `--prod` deploy is replaced by the next Git push.** If the same site also has Git continuous deployment connected, the next push to the production branch triggers a new build that auto-publishes and **replaces** your manually shipped `--prod` deploy — the hand-shipped build silently disappears from production. To keep a specific deploy live, **lock the published deploy** ("Stop auto publishing") from the site's Deploys list in the UI: while locked, new pushes still build but do not auto-publish until you unlock or manually publish. Mixing manual `--prod` deploys with Git CD on the same production branch is otherwise a race the next commit wins.

### Deploy URLs are public by link

Draft deploys (`netlify deploy`), Deploy Previews, branch deploys, and deploy permalinks each get a **unique URL that anyone with the link can open** — they are not private just because the URL is unguessable and unlisted. Don't treat a preview URL as a safe place for confidential or unreleased content on that basis alone. To actually restrict access, enable site protection in the UI (Password Protection, or Team/SSO protection); you can protect all deploys or only non-production deploys.

## Local Development

### Option 1: netlify dev

```bash
netlify dev
```

Wraps your framework's dev server and provides:
- Environment variable injection
- Functions and edge functions
- Redirects and headers processing

### Option 2: Netlify Vite Plugin (Vite-based projects)

For projects using Vite (React SPA, TanStack Start, SvelteKit, Remix), the Vite plugin provides Netlify platform primitives directly in the framework's dev server:

```bash
npm install @netlify/vite-plugin
```

```typescript
// vite.config.ts
import netlify from "@netlify/vite-plugin";
export default defineConfig({ plugins: [netlify()] });
```

Then run your normal dev command (`npm run dev`) — no `netlify dev` wrapper needed. This gives you access to Blobs, DB, Functions, and environment variables during development.

See the **netlify-frameworks** skill for framework-specific local dev guidance.

## Environment Variables

### CLI Management

```bash
# Set
netlify env:set API_KEY "value"
netlify env:set API_KEY "value" --secret              # Hidden from logs
netlify env:set API_KEY "value" --context production   # Context-specific

# Get
netlify env:get API_KEY

# List
netlify env:list
netlify env:list --plain > .env                        # Export to file

# Import from file
netlify env:import .env

# Delete
netlify env:unset API_KEY
```

### Context Scoping

Variables can be scoped to deploy contexts:

```bash
netlify env:set API_URL "https://api.prod.com" --context production
netlify env:set API_URL "https://api.staging.com" --context deploy-preview
netlify env:set DEBUG "true" --context branch:feature-x
```

### Accessing in Code

- **Server-side (Functions)**: Use `Netlify.env.get("VAR")` (preferred) or `process.env.VAR`
- **Client-side (Vite)**: Only `VITE_`-prefixed vars via `import.meta.env.VITE_VAR`
- **Client-side (Astro)**: Only `PUBLIC_`-prefixed vars via `import.meta.env.PUBLIC_VAR`

**Never use `VITE_` or `PUBLIC_` prefix for secrets** — these are exposed to the browser.

## When a command fails, surface and stop

When a `netlify` command, a deploy, or `netlify dev` fails, **report the failure to the user** with the exact error, the deploy log URL (the CLI prints one), and the affected site/branch — and stop. Do not invent recovery commands or escalate to lower-level tools: do not curl `https://api.netlify.com/...`, do not run `netlify api <method>` as a recovery hatch, and do not read auth tokens off disk to force the operation through. If the documented happy path is broken, that's a platform-state problem the user needs to see.

## Useful Commands

| Command | Description |
|---|---|
| `netlify status` | Auth and site link status |
| `netlify dev` | Start local dev server |
| `netlify build` | Run build locally (mimics Netlify environment) |
| `netlify deploy` | Draft deploy |
| `netlify deploy --prod` | Production deploy |
| `netlify dev:exec <cmd>` | Run command with Netlify environment loaded |
| `netlify env:list` | List environment variables |
| `netlify clone org/repo` | Clone, link, and set up in one step |
