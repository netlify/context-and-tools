---
name: netlify-edge-functions
description: Write, configure, and deploy Netlify Edge Functions (Deno runtime at the network edge) in TypeScript/JavaScript. Use when adding request/response manipulation at the edge — auth middleware, geolocation redirects, A/B testing and personalization, content localization, redirects/rewrites, SSR at the edge, or transforming responses — or when configuring path routing, response caching, or edge error handling. Triggers on tasks like "add auth middleware", "geo-based redirect", "A/B testing at the edge", "rewrite requests", or editing files in netlify/edge-functions.
---

# Netlify Edge Functions

**Reach for this (modern):** default-export handler + inline `config` export with a narrowly-scoped `path`. Import types from `@netlify/edge-functions`.

```ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // return Response | URL (rewrite) | undefined (continue chain)
};

export const config: Config = { path: "/products/*" };
```

**Avoid:** import maps in `deno.json` (unsupported — use a separate file via `deno_import_map`). Do not hand-write a function your framework's adapter already generates (Next.js, Astro, Remix, SvelteKit, Nuxt, etc.) — check the framework adapter/reference first; duplicating adapter middleware causes conflicts.

## File location

- Default directory: `YOUR_BASE_DIRECTORY/netlify/edge-functions`.
- Custom directory: `edge_functions` key under `[build]` in `netlify.toml`. Keep it **outside** the publish directory so source files aren't deployed.
- `.js`/`.ts`/`.jsx`/`.tsx` all supported. If a `.ts` and `.js` file share a name, the `.ts` is ignored and the `.js` deploys.

## ⚠️ A function without a route silently never runs

Edge functions are **not** auto-assigned a URL. No `config` export and no `netlify.toml` declaration = deploys clean, no build error, no warning, never executes. If "my edge function does nothing," check the route first.

## Request handling patterns

Handler receives `(request: Request, context: Context)`. Return one of:
- `Response` — respond directly (ends the chain; declared redirects for the path do not run)
- `URL` — rewrite to a **same-site** URL with 200 status (address bar unchanged)
- `undefined` / empty `return;` — bypass this function, continue the chain

Netlify adds no headers to edge requests — use `context` for client info.

### Redirect
```ts
export default async (req: Request, { cookies, geo }: Context) => {
  if (geo.city === "Paris" && cookies.get("promo-code") === "15-for-followers") {
    return Response.redirect(new URL("/subscriber-sale", req.url));
  }
};
```

### Rewrite (same-site only)
```ts
export default async (request: Request, { geo }: Context) => {
  if (geo.city === "Paris") return new URL("/subscriber-sale", request.url);
};
```
To reach another site or external content, use `fetch()` — rewrite via `URL` is same-site only.

### Middleware transform
```ts
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const response = await context.next();
  const text = await response.text();
  return new Response(text.toUpperCase(), response);
};
```
`context.next()` runs the rest of the chain and returns the origin `Response`. Only call it if you need the response body (it costs latency otherwise).

To transform a **different** path, use `fetch()` — but this starts a **new** request chain and re-runs any edge functions matching that path. Use `context.next()` to hit a static asset/serverless function at the same internal path without re-running edge functions.

### Read the request body
A body can only be read once. If you read it, pass a fresh request to `next()`:
```ts
export default async (req: Request, context: Context) => {
  const body = await req.json();
  if (!isValid(body.access_token)) return new Response("forbidden", { status: 403 });
  return context.next(new Request(req, { body: JSON.stringify(body) }));
};
```

### Conditional requests
`next()` normally forces a full response. For client caching control:
```ts
const res = await next({ sendConditionalRequest: true });
if (res.status === 304) return res;
```

## `Context` object

- **`geo`** — `city`, `country {code,name}`, `subdivision {code,name}`, `latitude`, `longitude`, `timezone`, `postalCode`.
- **`cookies`** — `get(name)`, `set(options)`, `delete(name|options)` (CookieStore web standard). ⚠️ Cross-subdomain cookies require a **custom domain** — `netlify.app` is on the Public Suffix List.
- **`next(options?)` / `next(request, options?)`** — continue the chain; `options.sendConditionalRequest`.
- **`params`** — path params, e.g. `/pets/:name` → `{ name: "winter" }`. Query string: use `request.url`.
- **`ip`**, **`requestId`**, **`server.region`**.
- **`site`** — `id`, `name`, `url`. **`account.id`**. **`deploy`** — `context`, `id`, `published`, `skewProtectionToken`.
- **`waitUntil(promise)`** — run work after the response is sent (analytics, logs) without blocking it. Still subject to the CPU time limit.

`Netlify.context` gives the same context inside the handler (`null` outside it).

## Environment variables

Access via `Netlify.env.get(name)` (also `has`, `set`, `delete`, `toObject`). `set`/`delete` are invocation-scoped only — they do **not** persist; use the Netlify env API to update.

```ts
const value = Netlify.env.get("MY_IMPORTANT_VARIABLE");
```

⚠️ **Gotchas:**
- Variables in `netlify.toml` are **NOT** available to edge functions.
- Scope must include **Functions** to reach runtime. **Build**-scoped vars are build-only — embed them at build time if needed.
- Values are frozen at deploy time. Change a var → new deploy required. Deploy Previews/branch deploys use their deploy-time values.

## Configuration / routing

Config via inline `config` export or `netlify.toml`. Properties:
- **`path`** — `URLPattern` string or array; must start with `/`. e.g. `["/", "/products/*"]`.
- **`excludedPath`** — exclude routes from `path`; must start with `/`. e.g. `["/*.css", "/*.js"]`.
- **`pattern`** / **`excludedPattern`** — regex alternatives to `path`/`excludedPath`.
- **`method`** — string or array of HTTP methods (inline only).
- **`header`** — object of header conditions: `true` (present), `false` (absent), or a regex string on the value. Names case-insensitive; multiple same-name values matched as comma-joined list.
- **`cache`** — `"manual"` to opt into caching.
- **`onError`** — error handling (see below).

### ⚠️ Scope `path` narrowly

`path: "/*"` intercepts **every** request including static assets — adds latency to each and **bills an edge invocation** for each. Match only the paths you need.

### netlify.toml (for ordering / multiple functions on a path)
```toml
[[edge_functions]]
  path = "/admin"
  function = "auth"

[[edge_functions]]
  path = "/admin"
  function = "injector"
  cache = "manual"
```
Header matching uses an `[edge_functions.header]` sub-table.

### Execution order
Config-file declarations run before inline; framework-generated before user; non-cached before cached. Within `netlify.toml`: top-to-bottom. Within inline: **alphabetical by file name**. To control order, prefer `netlify.toml`. If the same function is declared both inline and in toml, they merge and inline fields win.

Caveats: a function on the **target** of a static rewrite does **not** run for rewritten requests. If a function returns a `Response`, redirects for that path are skipped.

## Response caching (opt-in)

### ⚠️ Both parts or neither
Cache headers on the `Response` do **nothing** without `cache: "manual"` in config — and `cache: "manual"` without headers still caches nothing. You need **both**:

```ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  return new Response("Hello world", {
    headers: { "cache-control": "public, s-maxage=3600" },
  });
};

export const config: Config = { cache: "manual", path: "/hello" };
```

- Use caching only for endpoint-style responses reusable across clients (e.g. shared SSR HTML). **Never** for middleware, routing, or per-client personalization.
- Cached responses do **not** count toward invocations.
- ⚠️ A cached function **shadows real static files**: `cache:"manual"` on `/*` makes `/cat.png` serve the function, not the static file.
- Supported headers: `Cache-Control`, `CDN-Cache-Control`, `Netlify-CDN-Cache-Control`, `Expires`, `Vary`, `Netlify-Vary`. Headers must be set inline in code.
- New deploy in the same context voids `s-maxage`/`max-age`/`Expires` (atomic deploys).
- No local caching — cache headers are ignored under `netlify dev`.

## Error handling (`onError`, inline only)

- **`"fail"`** (default) — generic error page, stops the chain.
- **`"/custom-path"`** — rewrite to a same-site path (starts with `/`), served without invoking that path's edge functions.
- **`"bypass"`** — skip the erroring function, continue the chain.

Guidance: fail **closed** for critical logic (auth); fail **open** for progressive enhancement (localization → `bypass`).

## Runtime & modules

Deno runtime with many standard Web APIs (`fetch`/`Request`/`Response`/`URL`, `console`, `atob`/`btoa`, `TextEncoder`/`Decoder`(`Stream`), Web Crypto `crypto.randomUUID/getRandomValues/subtle`, `WebSocket`, timers, Streams API, `URLPattern`, `Performance`).

- **Node built-ins:** `import { randomBytes } from "node:crypto"` (`node:` prefix).
- **Deno modules:** URL import, e.g. `import React from "https://esm.sh/react"`.
- **npm packages (beta):** `npm install` then import by name. ⚠️ Packages needing native binaries (Prisma) or runtime dynamic imports (cowsay) may fail — prefer `node:` built-ins / Deno URLs.
- **Import maps:** separate file only (not `deno.json`), declared via `deno_import_map` in `[functions]`.

### SSR at the edge (.tsx)
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

## Edge vs serverless

Edge for low-latency request/response manipulation, geolocation, auth checks/redirects, A/B personalization. Serverless for long-running work (up to 15 min), heavy Node deps, database-heavy operations, background/scheduled tasks, or memory above 512 MB.

## Limits

- Code size: **20 MB** compressed (bundle).
- Memory: **512 MB** per deployed set.
- CPU execution: **50 ms** per request (excludes waiting on resources; `waitUntil` work still counts).
- Response header timeout: **40 s**.
- Invocations/month vary by plan; cached responses don't count.

## Local dev, deploy, monitor

```bash
npm install netlify-cli -g
netlify dev      # runs edge functions on local requests at :8888
```
- Geo mocking: `--geo=mock` (San Francisco) or `--geo=mock --country=XX`. Debug: `--edge-inspect` / `--edge-inspect-brk`.
- Manual deploys require CLI **12.2.8+** (older versions error). Deploys are atomic.
- Logs: **Logs & Metrics > Edge Functions** in the UI; each `console` log names the emitting function. Filter by name/path (glob) and time. Retention ≥24h (7 days on some plans).

## Feature limitations

- Split Testing enabled → edge functions do **not** run.
- Custom Headers (incl. basic auth headers) do **not** apply to edge functions.
- Prerendering does **not** apply to paths served by an edge function.
- Multiple framework plugins generating edge functions may collide.
- Not part of Netlify's HIPAA-compliant offering.

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
4. Choose edge vs serverless by workload shape: edge functions for low-latency
   request/response manipulation, geolocation logic, auth checks/redirects,
   and A/B personalization; serverless functions for long-running work (up to
   15 min), heavy Node.js dependencies, database-heavy operations,
   background/scheduled tasks, or memory needs above 512 MB.
5. Cache headers on an edge response do nothing without `cache: "manual"` in
   config — it's both or neither. Setting `Cache-Control` on the returned
   `Response` has no effect unless the function also opts in.
