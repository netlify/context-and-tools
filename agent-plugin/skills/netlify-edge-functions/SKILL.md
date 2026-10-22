---
name: netlify-edge-functions
description: Write, route, cache, and debug Netlify Edge Functions, the Deno-based TypeScript or JavaScript handlers in netlify/edge-functions that run at the network edge in front of static files and serverless functions. Activate this skill whenever someone wants to add auth middleware or a login gate, redirect or rewrite visitors by country or cookie, localize or personalize a page with geolocation, run A/B testing, transform or inject HTML into a response, stream server-side rendering at the edge, or cache an edge response. Also use it when an edge function silently does nothing, runs in the wrong order, ignores its Cache-Control headers, or cannot read an environment variable.
---

# Netlify Edge Functions

## Use this form

```ts
// netlify/edge-functions/hello.ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  return new Response(`Hello from ${context.geo.country?.name ?? "somewhere"}`);
};

export const config: Config = { path: "/hello" };
```

- One file = one function: a default-export handler plus a `config` export with the route. Alternatively, declare the route in `netlify.toml`.
- `Request` and `Response` are global. Import `Context` and `Config` types from `@netlify/edge-functions`.
- Read env vars with `Netlify.env.get()`. `process.env` works only for Next.js middleware.

**Avoid these:**
- A file with no `config.path` or `pattern` and no `[[edge_functions]]` entry. It deploys but never runs.
- Import maps in `deno.json`. They are unsupported. Use a separate file with `[functions] deno_import_map`.
- Variables set in `netlify.toml`. They are invisible to edge functions.
- `Netlify.env.set()` or `Netlify.env.delete()` as persistence. They affect only the current invocation.
- `fetch()` to the same site for the current path. Use `context.next()` instead.

## ⚠️ Footguns

- **No route = silent no-op.** Edge functions get no automatic URL.
- **`path: "/*"` runs on every request**, including assets. Narrow it, or add `excludedPath`.
- **Caching needs both parts:** `cache: "manual"` in config AND cache headers on the returned `Response`. With only one, nothing is cached.
- **Cached functions shadow static files.** A cached function on `/*` serves `/cat.png` instead of the file.
- **Returning a `Response` ends the chain.** Redirect rules for that path never run.
- **Same-site `fetch()` and `URL` rewrites start a new request chain.** Matching edge functions run again. Use `context.next()` to reach the static asset or serverless function at the same path.
- **The request body can be read once.** After `await req.json()`, pass `new Request(req, { body })` to `context.next()`.
- **Same-named `foo.ts` and `foo.js`:** the TS file is ignored and the JS file deploys.
- **50 ms CPU per request**, including `waitUntil` work.
- **Not executed** on sites with Split Testing enabled.
- **Custom Headers and basic-auth headers do not apply** to edge functions.
- **Not supported** on HIPAA-compliant hosting.
- **`netlify.app` is on the Public Suffix List.** Cross-subdomain cookies need a custom domain.

## Files

| What | Where |
|---|---|
| Functions | `<base>/netlify/edge-functions/*.{js,ts,jsx,tsx}` |
| Custom dir | `[build] edge_functions = "my-dir"` (relative to base dir; keep it outside the publish dir) |
| Name in toml | file name without extension (`auth.ts` → `function = "auth"`) |
| Import map | any JSON file, referenced by `[functions] deno_import_map = "./import_map.json"` |

## Return values

| Return | Effect |
|---|---|
| `Response` | sent to client; chain ends |
| `URL` | same-site rewrite, 200, address bar unchanged |
| `undefined` / `return;` | skip this function; chain continues |

### Endpoint
```ts
export default async () =>
  new Response("Hello, World!", { headers: { "content-type": "text/html" } });
export const config = { path: "/api/hello" };
```

### Redirect / rewrite
```ts
import type { Context } from "@netlify/edge-functions";

export default async (req: Request, { cookies, geo }: Context) => {
  if (geo.city === "Paris" && cookies.get("promo-code") === "15-for-followers") {
    return Response.redirect(new URL("/subscriber-sale", req.url)); // redirect
    // or: return new URL("/subscriber-sale", req.url);             // rewrite (same-site only)
  }
};
export const config = { path: "/sale" };
```
Rewrites must target the same site. To reach other sites, use `fetch`.

### Middleware (modify origin response)
```ts
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  if (new URL(request.url).searchParams.get("method") !== "transform") return;
  const response = await context.next();
  return new Response((await response.text()).toUpperCase(), response);
};
export const config = { path: "/blog/*" };
```
Call `context.next()` only when you need the response body. If you just return `undefined`, the chain continues on its own.

### Conditional requests
```ts
export default async (req: Request, { next }: Context) => {
  const res = await next({ sendConditionalRequest: true });
  if (res.status === 304) return res;
  return new Response((await res.text()).toUpperCase(), res);
};
```
By default, `next()` strips conditional headers, so it always returns a full response.

### Read body, then continue
```ts
export default async (req: Request, context: Context) => {
  const body = await req.json();
  if (!isValid(body.access_token)) return new Response("forbidden", { status: 403 });
  return context.next(new Request(req, { body: JSON.stringify(body) }));
};
```

### Netlify user gate (private / team-login-protected projects)
```ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const user = context.user; // undefined: public project, password protection, netlify dev
  if (!user) return new Response("Forbidden", { status: 403 });
  const allowed = (Netlify.env.get("ADMIN_USER_IDS") ?? "").split(",");
  if (!allowed.includes(user.id)) return new Response("Forbidden", { status: 403 });
  // user.email may be undefined, so use it for display only
};
export const config: Config = { path: "/admin/*" };
```

### Post-response work
```ts
export default async (req: Request, context: Context) => {
  context.waitUntil(fetch("https://analytics.example.com/event", { method: "POST" }));
  return new Response("ok");
};
```
`waitUntil` does not block the response, but it still counts against the 50 ms CPU limit.

### Streaming SSR (`.tsx`)
```tsx
import React from "https://esm.sh/react";
import { renderToReadableStream } from "https://esm.sh/react-dom/server";
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  const stream = await renderToReadableStream(
    <html><body><h1>Hello {context.geo.country?.name}</h1></body></html>
  );
  return new Response(stream, { headers: { "Content-Type": "text/html" } });
};
export const config: Config = { path: "/hello" };
```

## `Context`

| Property | Notes |
|---|---|
| `cookies.get(name)` / `.set(options)` / `.delete(name \| options)` | `set` and `delete` use `CookieStore` option format; they act on the outgoing response |
| `geo` | `city`, `country.{code,name}`, `subdivision.{code,name}`, `latitude`, `longitude`, `timezone`, `postalCode` (format varies) |
| `ip` | client IP |
| `next(options?)` / `next(request, options?)` | `Promise<Response>` from the next item in the chain |
| `params` | URLPattern named groups from `path` (`/pets/:name` → `{ name }`). For the query string, use `request.url` |
| `user` | `{ id, email?, expiresAt }` or `undefined`. It is a Netlify account, not Netlify Identity; for Identity, use `getUser()` from `@netlify/identity` |
| `waitUntil(promise)` | runs after the response is sent |
| `requestId`, `account.id`, `server.region` | — |
| `site` | `{ id, name, url }` |
| `deploy` | `{ context, id, published, skewProtectionToken }` |

Netlify adds no client-info headers to the request. Read client info from `context` instead.

`Netlify.context` gives the same object, but only inside the handler. Outside it, it is `null`.

`Netlify.env`: `get(name)`, `has(name)`, `toObject()`, and invocation-scoped `set` and `delete`. To change variables persistently, use the [env API](https://open-api.netlify.com/#tag/environmentVariables).

Web APIs:
- `console`, `atob`, `btoa`
- `fetch`, `Request`, `Response`, `URL`, `File`, `Blob`
- `TextEncoder`/`TextDecoder` (and their Stream variants), `Performance`
- Web Crypto: `randomUUID`, `getRandomValues`, `SubtleCrypto`
- WebSocket
- `setTimeout`, `clearTimeout`, `setInterval`
- Streams: `ReadableStream`, `WritableStream`, `TransformStream`
- URLPattern

Modules:
- Node built-ins: use the `node:` prefix (`import { randomBytes } from "node:crypto"`).
- Deno modules: import by URL, or through an import map.
- npm packages (beta): import by name. Packages with native binaries or runtime dynamic imports may break.

## Declarations

### Inline `config`
| Key | Value |
|---|---|
| `path` | URLPattern string or array; must start with `/` |
| `excludedPath` | URLPattern string or array; must start with `/` |
| `pattern` / `excludedPattern` | regex alternatives to `path` / `excludedPath` |
| `method` | HTTP method string or array |
| `header` | `{ name: true \| false \| "regex" }`; case-insensitive names; multi-value headers match the comma-joined list |
| `onError` | `"fail"` (default), `"/custom-path"`, or `"bypass"` |
| `cache` | `"manual"` |

```ts
export const config: Config = {
  path: "/*",
  excludedPath: ["/*.css", "/*.js", "/img/*"],
  header: { "user-agent": "(iPhone|Android)" },
};
```
The `netlify-agent-category` request header maps any user-agent to a [client category](https://docs.netlify.com/build/user-agent-categories).

### `netlify.toml`
The toml form supports `function`, `path`, `excludedPath`, `pattern`, `excludedPattern`, `[edge_functions.header]`, and `cache`. Set `onError` inline. Use toml when you need explicit ordering of several functions on one path.

```toml
[[edge_functions]]
  path = "/admin"
  function = "auth"

[[edge_functions]]
  path = "/admin"
  function = "injector"
  cache = "manual"

[[edge_functions]]
  pattern = "/products/(.*)"
  excludedPattern = "/products/things/(.*)"
  function = "highlight"

[[edge_functions]]
  path = "/*"
  excludedPath = "/img/*"
  function = "common"
  [edge_functions.header]
  x-required = true
  x-forbidden = false
```
A request to `/admin` runs `auth`, then `common`, then `injector`.

### Order
Netlify walks the following order **twice** for the request path. The first pass runs only functions without caching configured. The second pass runs only cached functions.

1. Framework-generated functions declared in a config file.
2. Your `netlify.toml` declarations, top to bottom.
3. Framework- and integration-generated inline declarations.
4. Your inline declarations, alphabetical by file name.

If the same function is declared both in toml and inline, the configs are merged and treated as step 4; inline wins for duplicate fields.

After the edge functions, redirect rules run, unless a function already returned a `Response`. A redirect to a new path repeats the whole process for that path.

An edge function declared on the *target* of a static rewrite does not run for rewritten requests.

## Response caching
```ts
import type { Config } from "@netlify/edge-functions";

export default async () =>
  new Response("Hello world", { headers: { "cache-control": "public, s-maxage=3600" } });

export const config: Config = { path: "/hello", cache: "manual" };
```
- Headers must be set in the function code. Supported headers:
  - `Cache-Control`, `CDN-Cache-Control`, `Netlify-CDN-Cache-Control`
  - `Expires` (overridden by `max-age`/`s-maxage`)
  - `Vary`, `Netlify-Vary`
- See [caching overview](https://docs.netlify.com/build/caching/caching-overview).
- A new deploy in the same deploy context invalidates cached responses.
- Cached hits skip invocation, and they do not count toward invocation limits.
- **Cache** reusable endpoint output, such as SSR.
- **Don't cache** routing or personalization middleware, such as cookie-based product ordering.
- Local dev has no cache. Cache headers are ignored locally.

## Error handling (`onError`)
| Value | Effect |
|---|---|
| `"fail"` (default) | chain stops; generic error page is shown |
| `"/unavailable"` | rewrite to that same-site path; edge functions on it are not invoked |
| `"bypass"` | skip the failing function; chain continues |

Fail closed for critical logic: use the default for internal auth, or a custom path for customer-facing auth. Fail open (`bypass`) for nice-to-haves such as localization.

## Environment variables
- Variables must have the **Functions** scope.
- **Build**-scoped variables exist only at build time; embed their values during the build if needed.
- Changing a variable requires a new deploy.
- Deploy info (site, region, deploy id) comes from `context`, not from env vars.

## Local dev / deploy / logs
- Run `npm install netlify-cli -g`, then `netlify dev`. Visit `http://localhost:8888/<path>`.
  - Changes apply on the next request.
  - Debug with `--edge-inspect` or `--edge-inspect-brk`.
  - Mock location with `--geo=mock` (San Francisco), or `--geo=mock --country=DE`.
  - `context.user` is undefined locally.
- Manual deploys require CLI **≥ 12.2.8**. Deploys are atomic, and Deploy Previews and rollbacks include edge functions.
- Logs: in the Netlify UI, go to **Cloud compute > Edge functions** (`https://app.netlify.com/projects/{site_name}/edge-functions`).
  - For older deploys: **Deploys** → open the deploy → **Edge Functions**.
  - `console.log` output is tagged with the function name.
  - Retention is ≥ 24 h (7 days on some plans).
  - [Log Drains](https://docs.netlify.com/manage/monitoring/log-drains) are available on Enterprise plans.

## Limits
| Limit | Value |
|---|---|
| Bundle size | 20 MB compressed |
| Memory (per set of deployed functions) | 512 MB |
| CPU time per request | 50 ms (excludes I/O wait) |
| Response header timeout | 40 s |

- Prerendering does not apply to paths served by an edge function.
- Multiple framework plugins that generate edge functions may collide.

Docs: [API](https://docs.netlify.com/build/edge-functions/api.md) · [Declarations](https://docs.netlify.com/build/edge-functions/declarations.md) · [Optional configuration](https://docs.netlify.com/build/edge-functions/optional-configuration.md) · [Limits](https://docs.netlify.com/build/edge-functions/limits.md) · [Examples](https://edge-functions-examples.netlify.app/)

<!-- Gaps: no legacy/deprecated handler form is documented; whether `method` works in netlify.toml is unstated. -->
<!-- Undocumented: context.params with regex `pattern` declarations; monthly invocation limits per plan. -->

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
6. When explaining declaration processing order, state the two-pass loop,
   not just the ordering: Netlify runs the whole declaration order TWICE —
   first pass runs only edge functions not configured for caching, second
   pass runs the ones with caching configured. "Non-cached before cached"
   without the loop framing is an incomplete answer.
7. On a private project or one with team login protection, `context.user`
   is the Netlify user who made the request (`id`, `email`, `expiresAt`).
   Use it for per-person checks and personalization instead of adding a
   second login, and never take identity from client-sent headers or
   cookies: Netlify verifies the login before the edge function runs. Every
   example must handle `context.user` being `undefined` (public projects,
   basic password protection, `netlify dev`), and `email` can be
   `undefined` too, so key decisions on `id`. This is a Netlify account,
   not a Netlify Identity user.
