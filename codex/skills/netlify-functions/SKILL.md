---
name: netlify-functions
description: Write, configure, and deploy Netlify serverless functions (TypeScript/JavaScript/Go). Use when adding an API endpoint or route handler, a contact-form or webhook handler, scheduled/cron jobs, background/long-running tasks, streaming responses (LLM/SSE), auth or Identity event handlers (signup/login), deploy-event hooks, cache purging, or geolocation logic under netlify/functions. Covers routing, regions, memory/vCPU, cron schedules, and env-var access.
---

# Netlify Functions

Functions live in `YOUR_BASE_DIRECTORY/netlify/functions/`. Prefer TypeScript `.mts` (JavaScript uses `.mjs`). A file `hello.mts`, `hello/hello.mts`, or `hello/index.mts` all create a function named `hello`. Keep the functions directory OUTSIDE your publish directory.

## Reach for this (modern) — bare function syntax

```ts title="netlify/functions/hello.mts"
import type { Config, Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  return new Response("Hello, world!")
}

export const config: Config = {
  path: "/hello",
}
```

Deployed at `https://<YOUR DOMAIN>/hello`. Install types: `npm install @netlify/functions`.

**Fetchable module** — equivalent shape when you need a `fetch` method (e.g. to combine with event handlers):

```ts title="netlify/functions/hello.mts"
import type { NetlifyFunction } from "@netlify/functions"

export default {
  fetch: (req, context) => new Response("Hello, world!"),
  config: { path: "/hello" },
} satisfies NetlifyFunction
```

**Avoid (legacy):** the `-background` filename suffix and event-name filename conventions (e.g. `deploy-succeeded.mts` reading `req.json().payload`). Both still work but new functions use `config.background` and typed event handlers (below).

## Routing

Set `config.path`; with a custom `path` the function is NO LONGER served at `/.netlify/functions/<name>`.

- Multiple paths: `path: ["/cats", "/dogs"]`.
- Patterns (web `URLPattern`): `path: ["/sale/*", "/item/:sku"]`. Named groups land on `context.params` (`/pets/:name` + `/pets/boo` → `{ name: "boo" }`). For query strings read `req.url`.
- `excludedPath: ["/product/*.css"]` carves exceptions out of a `path` pattern. Each must start with `/`.
- `preferStatic: true` — run only when no static file exists at the URL.
- `method: ["GET", "POST"]` — restrict HTTP methods (default: all).

**Go routing** is configured ONLY via `netlify.toml` redirects, never inline config:
```toml
[[redirects]]
  from = "/travel-guide/*"
  to = "/.netlify/functions/travel-guide"
  status = 200
```

## Config object

Export `const config` (or the `config` property of a Fetchable module).

| Key | Type | Notes |
|---|---|---|
| `path` | `string \| string[]` | Custom route(s). Mutually exclusive with `schedule`. |
| `excludedPath` | `string \| string[]` | Paths excluded from `path`. |
| `method` | method or array | `GET/POST/PUT/PATCH/DELETE/OPTIONS`. |
| `preferStatic` | `boolean` | Static assets win when present. |
| `background` | `boolean` | Background mode (202 immediately). |
| `schedule` | cron string | Cron schedule. Mutually exclusive with `path`/`excludedPath`. |
| `region` | airport code | e.g. `"dub"`. Per-function override. |
| `memory` | number/string | 1024–4096 MB (`2048` or `"2gb"`). Mutually exclusive with `vcpu`. |
| `vcpu` | number | 0.5–2.0. Mutually exclusive with `memory`. |
| `rateLimit` | object | `{ action, aggregateBy, to, windowSize, windowLimit }`. |

## Environment variables

Use `Netlify.env.get("MY_VAR")` — prefer it over `process.env`. Store secrets in env vars, never in code.

```ts title="netlify/functions/example.mts"
export default async (req: Request) => {
  const value = Netlify.env.get("MY_IMPORTANT_VARIABLE")
  return Response.json({ value })
}

export const config: Config = { path: "/example" }
```

**Footguns:**
- An env var is only available at runtime if its **scope includes Functions** (setting scopes needs Pro+).
- Env vars declared in `netlify.toml` are NOT available to functions.
- Values are frozen at deploy time — redeploy to pick up new values.
- Read-only reserved vars: `URL`, `SITE_NAME`, `SITE_ID` (cannot be set/overridden).
- Lambda-compat mode: all env vars combined must stay under **4 KB**.

## Context object (2nd arg)

`context.params` (route params), `context.geo` (`city`, `country {code,name}`, `latitude`, `longitude`, `subdivision`, `timezone`, `postalCode`), `context.ip`, `context.cookies` (`get`/`set`/`delete`, web `CookieStore` format), `context.site` (`id`/`name`/`url`), `context.deploy`, `context.account.id`, `context.server.region`, `context.requestId`.

- **`context.waitUntil(promise)`** — extend execution for post-response work (analytics, logs) without blocking the client response. Billed/logged duration includes this async work. Available for functions deployed on/after 2025-03-20.
- **Cookies gotcha:** setting cookies across subdomains needs a custom domain (`netlify.app` is on the Public Suffix List).

**Never add CORS headers unless explicitly requested.**

## Streaming

Return a `ReadableStream` as the `Response` body. Limits: **60s execution, 20 MB response**.

```ts
export default async (req: Request) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Netlify.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [/* ... */], stream: true }),
  })
  return new Response(res.body, { headers: { "content-type": "text/event-stream" } })
}
```

Or build a stream manually with `new ReadableStream({ start(controller) { controller.enqueue(...); controller.close() } })`.

## Background functions (long-running, up to 15 min)

Client gets `202` immediately; the return value is discarded. No streaming. On error: retry after 1 min, then again after 2 min.

```ts title="netlify/functions/process.mts"
export default async (req: Request) => {
  // Long-running work; client already got its 202.
}

export const config: Config = { background: true, path: "/process" }
```

## Scheduled functions (cron, UTC)

30-second limit. Inline cron works only for TS/JS — Go must use `netlify.toml`. The request body carries `{ next_run }` (ISO-8601).

```ts title="netlify/functions/nightly.mts"
export default async (req: Request) => {
  const { next_run } = await req.json()
  console.log("Next run:", next_run)
}

export const config: Config = { schedule: "@hourly" }
```

**Gotchas:** run only on **published deploys** (not Deploy Previews/branch deploys — invoke via **Run now** in the UI, or `netlify functions:invoke <name>` locally). No URL invocation, no POST payloads, no streaming, no Split Testing.

## Platform event handlers (deploy / Identity / form)

Export a default object with methods named after events. These ALWAYS run in the background; no client response. Combine with a `fetch` method to also serve web requests. Netlify verifies a JWS signature before invoking, so external requests can't trigger them.

```ts title="netlify/functions/on-deploy.mts"
import type { DeploySucceededEvent, DeployFailedEvent } from "@netlify/functions"

export default {
  deploySucceeded(event: DeploySucceededEvent) {
    console.log(`Deploy ${event.deploy.id} ok for ${event.site.name}`)
  },
  deployFailed(event: DeployFailedEvent) {
    console.log(`Deploy failed: ${event.deploy.errorMessage}`)
  },
}
```

**Deploy events:** `deployBuilding`, `deploySucceeded`, `deployFailed`, `deployDeleted`, `deployLocked`, `deployUnlocked`. Return `void`. Payload: `event.deploy` (id, state, url, context, branch, commitRef, ...) and `event.site`.

**Identity events:** `userValidate`, `userSignup`, `userLogin`, `userModified` (all can deny/mutate), `userDeleted` (notify-only). Call `event.deny()` to abort (user gets `401`; first denier wins). Return `{ user }` to mutate, or `void` to pass through. `event.user` — only `id` is guaranteed.

**Form events:** `formSubmitted`. `event.data` is field-name → string value of the verified submission.

## Helper exports (`@netlify/functions`)

- **`getContext()`** — get `Context` outside handler args (inside a framework/wrapper). Throws outside an active request — wrap in `try/catch` if call sites may run off-request.
- **`purgeCache({ tags?, deployAlias?, ... })`** — invalidate edge cache from inside a function; site ID/auth inferred from runtime. Omit `tags` to purge everything.

## Configuration (netlify.toml)

```toml
[functions]
  directory = "netlify/functions"       # overrides UI setting
  node_bundler = "esbuild"              # JavaScript only
  external_node_modules = ["package-1"]
  included_files = ["files/*.md"]

[functions.eu_data]                     # per-function
  region = "dub"
  memory = "2gb"                        # or vcpu = 1.5
```

`netlify.toml` overrides UI settings. Per-function `region` overrides the site-level UI region.

**Regions** (airport codes, per-function via `config.region` or `netlify.toml`): self-serve `cmh` (default, US East Ohio), `dub`, `fra`, `gru`, `iad`, `lhr`, `nrt`, `pdx`, `sfo`, `sin`, `syd`, `yul`; support-assisted `cdg`, `mxp`. Region selection needs Pro/Enterprise. Each function runs in exactly ONE region (no multi-region geo-routing). Framework-adapter-generated functions can't take `export const config` — set region in the project UI instead.

**Memory/vCPU** needs Credit-based Pro/Enterprise. Set one, not both: `memory` 1024–4096 MB, `vcpu` 0.5–2.0 (`0.5`→1024 MB, `2.0`→4096 MB). Billing scales linearly.

**Node.js runtime:** defaults to the build's Node version (fallback Node.js 24). Override with the `AWS_LAMBDA_JS_RUNTIME` env var (e.g. `nodejs24.x`) — set via UI/CLI/API, NOT `netlify.toml`.

**Module format:** `.mts`/`.mjs` → ES modules (preferred); `.cts`/`.cjs` → CommonJS; `.ts`/`.js` follow nearest `package.json` `"type"`. In ES modules use `import.meta.url` (no `__dirname`/`__filename`).

## Limits (not configurable)

- Synchronous execution: **60s** · Scheduled: **30s** · Background: **15 min**.
- Buffered request/response payload: **6 MB** (binary is Base64-encoded, ~30% overhead → ~4.5 MB effective binary request limit).
- Streamed response: **20 MB** · Background request/response: **256 KB**.

## Go / Lambda-compat (`@netlify/aws-lambda-compat`)

Required for Go; also for legacy AWS Lambda handler signatures. Install `npm install @netlify/aws-lambda-compat`. Wrap with `withLambda()`; route Go via `netlify.toml` redirects (inline cron/config unsupported).

```ts
import { withLambda } from "@netlify/aws-lambda-compat"
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/aws-lambda-compat"

export default withLambda(async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
})
```

Lambda-compat env vars capped at 4 KB total; consider migrating off compat mode to remove the limit.

<!-- GAP: source shows env-var access via process.env in examples; house rule mandates Netlify.env.get(), applied here. -->
<!-- GAP: memory/vcpu plan gating labeled "Credit-based Pro and Enterprise" — exact plan-name mapping not further specified. -->

<!-- system: agent-context/functions/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (functions)

These are org conventions, not docs facts — they are merged into the rendered
skill by ctx-gen and are never generated. Extracted from the previous
hand-written netlify-functions skill; owned by the skills maintainer.

1. Use TypeScript (`.mts`) when possible.
2. Access environment variables via `Netlify.env.get()` (prefer it over
   `process.env` for consistency).
3. Never add CORS headers unless explicitly requested.
4. Store secrets in environment variables, never in code.
