---
name: netlify-frameworks
description: Guide for deploying web frameworks on Netlify. Use when setting up a framework project (Vite/React, Astro, TanStack Start, Next.js, Nuxt, SvelteKit, Remix) for Netlify deployment, configuring adapters or plugins, running a framework project locally with Netlify's platform features, or troubleshooting framework-specific Netlify integration. Covers what Netlify needs from each framework, how adapters handle server-side rendering, and the general local development options (`netlify dev` versus the Netlify Vite plugin family).
---

# Frameworks on Netlify

Netlify supports any framework that produces static output. For frameworks with server-side capabilities (SSR, API routes, middleware), an adapter or plugin translates the framework's server-side code into Netlify Functions and Edge Functions automatically.

## How It Works

During build, the framework adapter writes files to `.netlify/v1/` — functions, edge functions, redirects, and configuration. Netlify reads these to deploy the site. You do not need to write Netlify Functions manually when using a framework adapter for server-side features.

## Detecting Your Framework

Check these files to determine the framework:

| File | Framework |
|---|---|
| `astro.config.*` | Astro |
| `next.config.*` | Next.js |
| `nuxt.config.*` | Nuxt |
| `vite.config.*` + `react-router` | Vite + React (SPA or Remix) |
| `vite.config.*` + `@tanstack/react-start` | TanStack Start |
| `svelte.config.*` | SvelteKit |

## Framework Reference Guides

Each framework has specific adapter/plugin requirements and local dev patterns:

- **Vite + React (SPA or with server routes)**: See [references/vite.md](references/vite.md)
- **Astro**: See [references/astro.md](references/astro.md)
- **TanStack Start**: See [references/tanstack.md](references/tanstack.md)
- **Next.js**: See [references/nextjs.md](references/nextjs.md)
- **Nuxt**: See [references/nuxt.md](references/nuxt.md)
- **SvelteKit**: See [references/sveltekit.md](references/sveltekit.md)

## Local Development

Running a framework project locally with Netlify's platform features (environment variables, Functions, Edge Functions) generally comes from one of two places:

### `netlify dev`

```bash
netlify dev
```

Wraps the framework's own dev server and adds:
- Environment variable injection
- Functions and Edge Functions
- Redirects and headers processing

Works with any framework — run `netlify dev` in place of the framework's native dev command (e.g. instead of `npm run dev`).

### Netlify Vite plugin family (Vite-based frameworks)

For frameworks built on Vite, a Netlify Vite plugin exposes platform primitives (Functions, Blobs, DB, environment variables) directly inside the framework's own dev server, so no `netlify dev` wrapper is needed — run the framework's normal dev command (e.g. `npm run dev`) once the plugin is registered in `vite.config.ts`.

- Vite-based projects (React SPA, SvelteKit, Remix): `@netlify/vite-plugin` — see [references/vite.md](references/vite.md)
- TanStack Start: `@netlify/vite-plugin-tanstack-start` — see [references/tanstack.md](references/tanstack.md)

The per-framework reference guides may also document other local dev options (e.g. `netlify dev`) — check the guide for your framework for setup specifics.

### Running a single command with the Netlify environment loaded

```bash
netlify dev:exec <cmd>
```

Loads the Netlify environment (env vars, etc.) for a single command without starting a dev server — useful for scripts, tests, or one-off tasks that need Netlify-managed environment variables.

## General Patterns

### Client-Side Routing (SPA)

For single-page apps with client-side routing, add a catch-all redirect:

```toml
# netlify.toml
[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

> **Remove this catch-all when you adopt an SSR adapter.** A `/* → /index.html` rule left over from an SPA setup will shadow your server routes: user-defined redirects in `netlify.toml`/`_redirects` take precedence over the routes a framework adapter generates, so every request — including SSR pages and API/function routes — is served the static `index.html` with a 200. When you migrate a client-rendered app to SSR, delete the SPA catch-all.

### Custom 404 Pages

- **Static sites**: Create a `404.html` in your publish directory. Netlify serves it automatically for unmatched routes.
- **SSR frameworks**: Handle 404s in the framework's routing (the adapter maps this to Netlify's function routing).

### Environment Variables in Frameworks

Each framework exposes environment variables to client-side code differently:

| Framework | Client prefix | Access pattern |
|---|---|---|
| Vite / React | `VITE_` | `import.meta.env.VITE_VAR` |
| Astro | `PUBLIC_` | `import.meta.env.PUBLIC_VAR` |
| Next.js | `NEXT_PUBLIC_` | `process.env.NEXT_PUBLIC_VAR` |
| Nuxt | `NUXT_PUBLIC_` | `useRuntimeConfig().public.var` |

In server-side code, prefer `Netlify.env.get("VAR")` to read environment variables. `process.env.VAR` also works inside Netlify Functions, but Edge Functions expose only `Netlify.env.get` — the portable form keeps server code working in both.

**Never use a client prefix (`VITE_`, `PUBLIC_`, `NEXT_PUBLIC_`, `NUXT_PUBLIC_`) for secrets.** Client-prefixed variables are inlined into the client bundle and exposed to the browser.

### Environment Variable Changes Require a Redeploy

Client-prefixed vars (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NUXT_PUBLIC_`) are **inlined into the client bundle at build time** — their values are compiled into the JavaScript shipped to the browser. Editing one in the Netlify UI or CLI has no effect on the live site until a new build runs. The same applies server-side: Netlify injects environment variables at build time, so changing a value in the dashboard does **not** propagate to already-deployed functions on the next request. Any env var change — client- or server-side — requires a redeploy to take effect. If a value looks stale after you changed it, trigger a new deploy.

### Runtime File Reads in Adapter-Generated Functions

When an adapter turns your server code into a Netlify Function, only traced module dependencies are bundled. Arbitrary files you read from disk at runtime — a local JSON/Markdown data file, an email template, an `fs.readFile()` target — are **not** uploaded with the function unless you declare them. Such a read succeeds under `npm run dev` (the whole project is on disk) but throws `ENOENT` in production. Declare the files so they ship with the function: in Next.js set `outputFileTracingIncludes` in `next.config`; for a hand-written Netlify Function use `included_files` in its `config`. Never assume the project filesystem is present at function runtime.
