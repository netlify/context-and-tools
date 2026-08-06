---
name: netlify-edge-functions
description: Write and configure Netlify Edge Functions (Deno runtime) for auth middleware, A/B testing, geolocation/personalization, redirects, rewrites, response transforms, edge SSR, and setting cookies/headers. Use when adding an edge function under netlify/edge-functions, wiring routes via a config export or [[edge_functions]] in netlify.toml, reading geo/cookies/env at the edge, or debugging "my edge function does nothing" and route/caching order issues. Check the framework adapter first before hand-writing middleware.
---

# Netlify Edge Functions

Before hand-writing an edge function, check whether the framework's adapter already generates the middleware you need — a custom function duplicating adapter-generated one causes conflicts. Only hand-write when the framework doesn't already generate one for the job.

## Modern syntax (reach for this)

Default export handler + `config` export. Import types from `@netlify/edge-functions`.

```ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  return new Response("Hello world");
};

export const config: Config = { path: "/test" };
```

- `Request`/`Response`/`URL` are global. `Context` and `Config` come from `@netlify/edge-functions`.
- Get client info from `context`, NOT request headers — Netlify does not add headers to edge requests.

## File location

- Directory: `YOUR_BASE_DIRECTORY/netlify/edge-functions` (default). Extensions: `.js`, `.ts`, `.jsx`, `.tsx`.
- Custom directory via `netlify.toml`; keep it OUTSIDE your publish directory so source files aren't deployed:
  ```toml
  [build]
    edge_functions = "my-custom-directory"
  ```
- Name collision: if `my-function.ts` and `my-function.js` both exist, the `.ts` is ignored and `.js` is deployed.

## Routing — REQUIRED, or the function silently never runs

An edge function with no route (no `config` export AND no `netlify.toml` declaration) still deploys but **never runs — no build error, no warning**. If "my edge function does nothing", check the route first.

Scope `path` narrowly. `path: "/*"` intercepts EVERY request including static assets, adding latency and billing an edge invocation for each one.

`path` must start with `/`. String or array of strings; supports `URLPattern`.

```ts
export const config: Config = {
  path: "/*",
  excludedPath: ["/*.css", "/*.js"],
};
```

## Return values (handler)

- `Response` — endpoint. Ends the request chain; redirects declared for that path do NOT run.
- `URL` — rewrite to a **same-site** URL (200, address bar unchanged). External/other-site content: use `fetch`.
- `Response.redirect(url)` — redirect.
- `undefined` / bare `return;` — bypass, continue the chain.
- `context.next()` — middleware: continue the chain and modify the response. Only call `next()` when you need the response body.

## Request-handling patterns

Redirect / rewrite by geo + cookie:
```ts
export default async (req: Request, { cookies, geo }: Context) => {
  if (geo.city === "Paris" && cookies.get("promo-code") === "15-for-followers") {
    return new URL("/subscriber-sale", req.url);      // rewrite (same-site)
    // return Response.redirect(new URL("/subscriber-sale", req.url)); // redirect
  }
};
```

Transform a response (middleware):
```ts
export default async (request: Request, context: Context) => {
  const response = await context.next();
  const text = await response.text();
  return new Response(text.toUpperCase(), response);
};
```

Read the request body, then forward — a body can only be read once, so pass a new request:
```ts
export default async (req: Request, context: Context) => {
  const body = await req.json();
  if (!isValid(body.access_token)) return new Response("forbidden", { status: 403 });
  return context.next(new Request(req, { body: JSON.stringify(body) }));
};
```

Conditional request (default: `next()` forces a full response — opt in for 304s):
```ts
const res = await next({ sendConditionalRequest: true });
if (res.status === 304) return res;
```

Fetch a different same-site path (starts a NEW request chain; matching edge functions re-run — use `context.next()` to avoid re-running):
```ts
const res = await fetch(new URL("/welcome", req.url));
```

Edge SSR with `.tsx`:
```tsx
import React from "https://esm.sh/react";
import { renderToReadableStream } from "https://esm.sh/react-dom/server";
import type { Config, Context } from "@netlify/edge-functions";

export default async function handler(req: Request, context: Context) {
  const stream = await renderToReadableStream(
    <html><body><h1>Hello {context.geo.country?.name}</h1></body></html>
  );
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/html" } });
}

export const config: Config = { path: "/hello" };
```

## Context object

- `geo` — `city`, `country.{code,name}`, `subdivision.{code,name}`, `latitude`, `longitude`, `timezone`, `postalCode`.
- `cookies` — `get(name)`, `set(options)` (CookieStore.set format), `delete(name|options)`.
- `ip` — client IP string.
- `params` — path params, e.g. path `/pets/:name` + request `/pets/winter` → `{name:"winter"}`. Query string: use `request.url`.
- `next(options?)` / `next(request, options?)` — continue chain; `sendConditionalRequest` option.
- `waitUntil(promise)` — run work after the response is sent (analytics, logs); still counts against CPU time.
- `site` — `{id,name,url}`. `deploy` — `{context,id,published,skewProtectionToken}`. `account.id`. `server.region`. `requestId`.

Cookies across subdomains require a custom domain — `netlify.app` is on the Public Suffix List so subdomain cookies are blocked.

Also available as `Netlify.context` (returns `null` outside the handler).

## Environment variables

Read via `Netlify.env`: `get(name)`, `has(name)`, `set(name,value)`, `delete(name)`, `toObject()`.

```ts
const value = Netlify.env.get("MY_IMPORTANT_VARIABLE");
```

- **Scope must include Functions** or the variable is unavailable at edge runtime.
- **Variables set in `netlify.toml` are NOT available to edge functions.**
- `set`/`delete` only affect the current invocation — they do NOT persist. To change values, use the Netlify env API endpoints and redeploy.
- Values are frozen at deploy time; changing a variable requires a new build/deploy.
- Build-scope variables are build-only — embed them at build time (script or Netlify Bundle ENV plugin) to use at runtime.
- Next.js middleware only: `process.env` also works.

## Configuration reference

Inline `config` properties: `path`, `excludedPath`, `pattern`/`excludedPattern` (regex alternatives), `method`, `header`, `onError`, `cache`.

`netlify.toml` `[[edge_functions]]` properties: `function`, `path`, `excludedPath`, `pattern`/`excludedPattern`, `header`, `cache`. (`method` and `onError` are inline-only.)

Use `netlify.toml` to run multiple functions on one path and control their order.

### Match by header
Keys are header names (case-insensitive). Value `true` = must be present, `false` = must be absent, string = regex match against the value (multiple same-name headers are comma-joined).
```ts
export const config: Config = {
  header: { "x-required": true, "x-forbidden": false, "user-agent": "(iPhone|Android)" },
  path: "/*",
};
```

### Declaration & processing order
Multiple `[[edge_functions]]` for the same path run top-to-bottom; one function can serve many paths.
```toml
[[edge_functions]]
  path = "/admin"
  function = "auth"
[[edge_functions]]
  path = "/admin"
  function = "injector"
  cache = "manual"
```
Order overall: config-file declarations before inline; framework-generated before user-created; **non-cached functions before cached ones**. Inline functions on the same path run in ALPHABETICAL order by file name. If the same function is declared both in `netlify.toml` and inline, configs merge and are treated as inline (inline wins on conflicts).

After all edge functions run, redirect rules evaluate — unless a function returned a response and ended the chain. If you declare an edge function on the target path of a static rewrite, it does NOT execute for rewritten requests.

## Response caching

Opt in with `cache: "manual"`. **Cached functions shadow existing static files** — a cached function on `/*` serves `/cat.png` instead of the real `cat.png`. Cached responses do NOT count as invocations. There is NO local caching — cache headers are ignored in `netlify dev`.
```ts
export const config: Config = { cache: "manual", path: "/hello" };
```
Customize via response headers, e.g. `'cache-control': 'public, s-maxage=3600'`.

## Error handling

```ts
export const config: Config = {
  path: "/hello",
  onError: "fail",   // "fail" | "/unavailable" (rewrite path) | "bypass"
};
```

## Modules & import maps

- Node built-ins: `import { randomBytes } from "node:crypto"`.
- Deno: URL import, e.g. `import React from "https://esm.sh/react"`.
- npm (BETA): `npm install` then `import _ from "lodash"`. Packages needing native binaries (Prisma) or runtime dynamic imports (cowsay) may fail.
- Import maps: use a SEPARATE import-map file (not `deno.json`), declared in `netlify.toml`:
  ```toml
  [functions]
    deno_import_map = "./path/to/import_map.json"
  ```

## Local dev, deploy, logs

```bash
npm install netlify-cli -g
netlify dev            # visit http://localhost:8888/<path>
```
- Changes apply on new requests — edit, save, reload. Debug with `--edge-inspect` / `--edge-inspect-brk`.
- Mock geo: `--geo=mock` (San Francisco) or `--geo=mock --country=<CC>`.
- Manual deploys require Netlify CLI **12.2.8+** (older versions error). Deploys are atomic; new logic/declarations don't affect old deploys until you publish.
- Logs: Netlify UI → **Logs & Metrics > Edge Functions**; per-deploy logs via the Deploys tab. `console.log` output is tagged with the function name. Retained ≥24h (7 days on some plans).

## Limits & unsupported

- Code bundle: 20 MB compressed. Memory: 512 MB per deployed set. CPU: 50 ms/request (excludes I/O wait). Response-header timeout: 40 s.
- Rewrites are same-site only — use `fetch` for other/external sites.
- NOT executed when Split Testing is enabled. Custom Headers (incl. basic auth) do NOT apply to edge functions. Prerendering does NOT apply to edge-served paths.
- Multiple framework plugins generating edge functions may collide.
- NOT part of Netlify's HIPAA-compliant hosting.

<!-- Supported Web APIs list (console, atob/btoa, Fetch, TextEncoder/Decoder + streams, Performance, Web Crypto, WebSocket, timers, Streams, URLPattern) noted in source but omitted here as low-impact for authoring; consult api.md if needed. -->

<!-- system: agent-context/edge-functions/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (edge-functions)

These are org conventions and field-learned guardrails, not docs facts — they
are merged into the rendered skill by ctx-gen and are never generated.
Extracted from the previous hand-written netlify-edge-functions skill; owned
by the skills maintainer.

1. Check the framework's adapter/reference first: a custom edge function that
   duplicates adapter-generated middleware causes conflicts. Only hand-write
   an edge function when the framework doesn't already generate one for the
   job.
2. Scope `path` narrowly. `path: "/*"` intercepts every request — including
   static assets — adding latency to each one and billing an edge invocation
   for it.
3. An edge function without a route (no config export, no netlify.toml
   declaration) still deploys, but silently never runs: no build error, no
   warning. When "my edge function does nothing", check the route first.
