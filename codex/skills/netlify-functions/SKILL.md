---
name: netlify-functions
description: Write, configure, and deploy Netlify serverless functions (TypeScript/JavaScript/Go) — synchronous, background, scheduled, and event-triggered. Use when creating API endpoints, cron jobs, long-running tasks, streaming responses, or platform event handlers on a Netlify site.
---

# Netlify Functions

## File locations and naming

- Default directory: `YOUR_BASE_DIRECTORY/netlify/functions` (override in `netlify.toml` `[functions] directory` or UI: Project configuration > Build & deploy > Continuous deployment > Build settings > Functions directory). Keep it **outside the publish directory**.
- Endpoint name is **case-sensitive**, derived from the filename or dedicated parent directory. Entry file in a subdirectory must be named `index` or match the directory name. All create endpoint `/.netlify/functions/hello`:
  - `netlify/functions/hello.mts`
  - `netlify/functions/hello/hello.mts`
  - `netlify/functions/hello/index.mts`
  - JS: `.mjs`; Lambda-compat: `.ts`/`.js`; Go: `netlify/functions/hello/hello.go` or `.../main.go` (Go requires a dedicated subdirectory)
- **Background functions**: append `-background` (`hello-background.mts`) → endpoint `/.netlify/functions/hello-background`.
- **Event-triggered functions**: name the file after the event (`deploy-succeeded.ts`, or `deploy-succeeded-background.ts` for background). Event names are reserved.
- Setup: `npm install @netlify/functions`. No TS tooling needed; Netlify does **no type checking** (run `tsc --noEmit` yourself). `tsconfig.json` is loaded from the functions directory, repo root, or base directory.

## Quick start (modern API)

Default export receiving a web-platform `Request` and a Netlify `Context`; return a `Response`. No return value → empty `204`.

```ts
// netlify/functions/hello.mts
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  return new Response("Hello, world!")
}
```

Custom path with named params:

```ts
import { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const { city, country } = context.params;
  return new Response(`You're visiting ${city} in ${country}!`);
};

export const config: Config = {
  path: "/travel-guide/:city/:country"
};
```

Environment variables via the `Netlify` global:

```ts
import { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const requestKey = req.headers.get("X-API-Key");
  const apiKey = Netlify.env.get("MY_API_KEY");
  if (requestKey === apiKey) return new Response("Welcome!");
  return new Response("Sorry, no access for you.", { status: 401 });
};
```

Post-response work without delaying the response:

```ts
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  context.waitUntil(logRequest(req));
  return new Response("Hello, world!");
};

async function logRequest(req: Request) {
  await fetch("https://example.com/log", {
    method: "POST",
    body: JSON.stringify({ url: req.url, timestamp: Date.now() }),
    headers: { "Content-Type": "application/json" },
  });
}
```

`waitUntil` requires functions deployed on or after 2025-03-20; async work counts toward billed duration and the execution time limit.

## Function kinds

| Kind | Naming | Response | Limits |
|---|---|---|---|
| Synchronous | `<name>.mts` | `Response` (may stream) | 60 s (overview page; scheduled-functions page says 30 s for scheduled), 1024 MB, 6 MB buffered payload (~4.5 MB effective binary due to Base64), 20 MB streamed |
| Background | `<name>-background.mts` | Ignored; client gets empty `202` immediately | 15 min, 256 KB request/response payload |
| Scheduled | any name + `schedule` config | No response body | Runs on published deploys only, UTC cron |
| Event-triggered | file named after event | Depends on event | JWS-verified; reserved names |

### Scheduled functions

Cron in UTC, crontab format; RFC extensions supported except `@reboot` and `@annually` (`@yearly` `0 0 1 1 *`, `@monthly`, `@weekly` `0 0 * * 0`, `@daily` `0 0 * * *`, `@hourly` `0 * * * *`). Request body is JSON with `next_run` (ISO-8601 string). No payloads/POST data, no streaming, no direct URL invocation.

Inline (TS/JS only):

```ts
// netlify/functions/test-scheduled-function.mts
import type { Config } from "@netlify/functions"

export default async (req: Request) => {
    const { next_run } = await req.json()
    console.log("Received event! Next invocation at:", next_run)
}

export const config: Config = {
    schedule: "@hourly"
}
```

Or in `netlify.toml` (required for non-TS/JS languages):

```toml
[functions."test-scheduled-function"]
schedule = "@hourly"
```

### Background functions

```ts
// netlify/functions/hello-background.mts
import { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  await someLongRunningTask();
  console.log("Done");
};
```

Invoke with `POST /.netlify/functions/hello-background` to pass parameters. Retries on invocation error: after 1 minute, then 2 minutes later. Real-time logs only (no date-filtered history). Plan gating (verbatim): "This feature is available on Credit-based plans, including Free, Personal, and Pro and on Enterprise plans. If you are on the legacy Pro plan, this feature is available only until December 15, 2025."

### Event-triggered functions

Name the file after the event: `deploy-building`, `deploy-succeeded`, `deploy-failed`, `deploy-deleted`, `deploy-locked`, `deploy-unlocked`, `split-test-activated`, `split-test-deactivated`, `split-test-modified`, `submission-created`, `identity-validate`, `identity-signup` (email+password signups only, not Google/GitHub), `identity-login`.

Body is JSON: `{ "payload": { ...triggering object... }, "site": { ...site info... } }`. Netlify signs each event with a JWS and verifies it before invoking — external requests can't trigger these. For durable event-driven architecture, see Async Workloads (https://docs.netlify.com/build/async-workloads/overview).

Identity events: returning a status other than `200`, `202`, or `204` **blocks the signup/login**. On `200` you may return new `user_metadata`/`app_metadata`:

```ts
import type { Handler, HandlerEvent } from "@netlify/functions";
export async function handler(event: HandlerEvent): Handler {
  const user = JSON.parse(event.body).user;
  return {
    body: JSON.stringify({
      ...user,
      app_metadata: { ...user.app_metadata, roles: ["admin"] },
    }),
    statusCode: 200,
  };
}
```

### Streaming responses (Beta, all plans)

Return a `ReadableStream` as the `Response` body. Limits: **10 s** execution (stream stops when reached), **20 MB** response. Not available for background functions, scheduled functions, or On-demand Builders.

```ts
export default async () => {
  const encoder = new TextEncoder();
  const formatter = new Intl.DateTimeFormat("en", { timeStyle: "medium" });
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("<html><body><ol>"));
      let i = 0;
      const timer = setInterval(() => {
        controller.enqueue(
          encoder.encode(`<li>Hello at ${formatter.format(new Date())}</li>\n\n`)
        );
        if (i++ >= 5) {
          controller.enqueue(encoder.encode("</ol></body></html>"));
          controller.close();
          clearInterval(timer);
        }
      }, 1000);
    }
  });
  return new Response(body);
};
```

An upstream SSE body (`res.body` from `fetch`) can be returned directly with header `"content-type": "text/event-stream"`, or wrap an async-iterable SDK stream in a `ReadableStream` that `controller.enqueue`s encoded chunks.

## API surface

### `Context` (second handler argument)

| Property | Contents |
|---|---|
| `account` | `id` — team ID |
| `cookies` | `get(name)`, `set(options)` (CookieStore.set format), `delete(name \| options)`. Cross-subdomain cookies impossible on `netlify.app` (Public Suffix List) — needs custom domain |
| `deploy` | `context`, `id`, `published` (bool), `skewProtectionToken` (identifies the deploy in HTTP calls when skew protection is enabled) |
| `geo` | `city`, `country.code`/`.name` (ISO 3166), `latitude`, `longitude`, `subdivision.code`/`.name`, `timezone`, `postalCode` |
| `ip` | Client IP string |
| `params` | Values from `path` named groups; e.g. `path: "/pets/:name"` + `/pets/boo` → `{"name":"boo"}`. Query string: use `request.url` |
| `requestId` | Netlify request ID, e.g. `01FDWR77JMF2DA1CHF5YA6H07C` |
| `server` | `region`, e.g. `us-east-1` |
| `site` | `id`, `name` (Netlify subdomain), `url` |
| `waitUntil(promise)` | Extends execution past the response (ExtendableEvent.waitUntil standard) |

### `Netlify` global

- `Netlify.context` — the `Context` object; `null` outside the handler scope.
- `Netlify.env` — `get(name)`, `has(name)`, `set(name, value)`, `delete(name)` (set/delete apply to the invocation only), `toObject()`.
- `process.env.VARIABLE_NAME` also works at runtime (including scheduled, background, On-demand Builders).

### `config` export

- `path`: string or array; URLPattern syntax; must start with `/`; wildcards (`/sale/*`) and named groups (`/item/:sku`).
- `excludedPath`: string or array of URLPattern exclusions (e.g. `"/*.css"`).
- `preferStatic`: `true` prevents the function from shadowing static CDN files (default: function wins).
- `schedule`: cron string (TS/JS only; other languages use `netlify.toml`).

```ts
import { Config } from "@netlify/functions";

export const config: Config = {
  path: "/product/*",
  excludedPath: ["/product/*.css", "/product/*.js"]
}
```

### Read-only runtime env vars

`SITE_NAME`, `SITE_ID`, `URL`, plus AWS Lambda reserved runtime variables. Reserved keys can't be set or overridden.

## Module format (Node.js)

| Extension | Format |
|---|---|
| `.mts` / `.mjs` | always ES modules |
| `.cts` / `.cjs` | always CommonJS |
| `.ts` / `.js` | ESM if closest `package.json` has `"type": "module"`, else CJS |

Prefer ESM (interoperable with Edge Functions). CJS can't static-`import` ESM packages (use dynamic `import()`); ESM can't use named imports from CJS packages (use default import); ESM has no `__dirname`/`__filename` (use `import.meta.url`).

## Dependencies

`package.json` + `node_modules` at the base directory; Netlify parses each function file and zips required dependencies with it (@netlify/zip-it-and-ship-it). **`devDependencies` are not bundled** — use `dependencies`.

## Configuration

### `netlify.toml`

```toml
[functions]
  directory = "my_functions"            # overrides UI setting
  node_bundler = "esbuild"              # JS only; TS always uses esbuild
  external_node_modules = ["package-1"]
  included_files = ["files/*.md"]

[functions."test-scheduled-function"]
schedule = "@hourly"
```

`netlify.toml` settings override the UI. **Env vars declared in `netlify.toml` are NOT available to functions** — set them via UI/CLI/API with the **Functions** scope; changes require a rebuild + deploy. Build-scoped vars need values embedded at build time.

### Runtime / region

- Node.js runtime defaults to the build's Node version (functions deployed on/after 2023-05-15); falls back to Node.js 22. Override with env var `AWS_LAMBDA_JS_RUNTIME` (e.g. `nodejs20.x`) set via UI/CLI/API — **not** `netlify.toml` — then redeploy. Minimum Node.js 18.0.0.
- Region default: `us-east-2` (sites created after 2023-10-04). Region selection is Pro/Enterprise; UI: Project configuration > Build & deploy > Continuous deployment > Functions region, then redeploy. Self-serve regions: ap-northeast-1, ap-southeast-1, ap-southeast-2, ca-central-1, eu-central-1, eu-west-2, sa-east-1, us-east-1, us-east-2, us-west-1, us-west-2 (eu-west-3 and eu-south-1 via support).
- Go version comes from the site's build image.

## Local development and testing

- `netlify dev` — simulated production environment (redirects, proxy rules, env vars, functions).
- Geolocation mocking: `--geo=mock` (San Francisco default), `--geo=mock --country=<two-letter code>`.
- `netlify functions:invoke` — invoke a function served by Netlify Dev; the local debugging path for scheduled and event-triggered functions (Netlify Dev never runs schedules).
- `netlify functions:serve` — standalone functions server without full Netlify Dev.
- Scheduled functions on deploy previews/branch deploys: use the **Run now** button on the function's page in the Netlify UI Functions tab.

## Deployment

1. **Continuous deployment (Git)** — automatic build from naming conventions. If `my-function.ts` and `my-function.js` both exist, **the JS one deploys and the TS one is ignored**. Custom build commands run first (e.g. `tsc hello/function.ts --outfile netlify/functions/hello.js`); to fully bypass preparation, output Node.js ZIP archives (or Go linux/amd64 binaries) into the functions directory.
2. **Manual CLI deploys** — install dependencies first so the CLI can zip them; Go: precompile `GOOS=linux GOARCH=amd64` binaries.
3. **API file digest deploys** — zip each function with its dependencies yourself.

Deployed functions are **immutable per deploy**: production updates don't change branch-deploy or Deploy Preview versions.

## Logs

- UI: **Logs & Metrics > Functions**; select a function. Real-time tail by default; date filters (hour/day/7 days/custom) — background functions support real-time only.
- Retention: 24 h minimum, 7 days on certain plans. Lambda-compat mode: 4 KB retained per invocation.
- CLI streaming: https://cli.netlify.com/commands/logs/#logsfunction. Log Drains (Enterprise): 700 KB per entry.
- Usage/billing: Project configuration > Functions > Overview > Usage (Requests + Run time per billing period).

## Constraints and gotchas

- Sync: 60 s limit per the overview page ("including scheduled functions"); the Scheduled Functions page says 30 s for scheduled — conflict preserved in the docs; assume the stricter 30 s for scheduled work.
- Streaming: 10 s / 20 MB. Background: 15 min / 256 KB. Only region and Private Connectivity are customizable; other limits are fixed.
- Scheduled functions don't work with: payloads/POST data, streaming, direct URL invocation, Split Testing, or site-wide basic password protection (use custom-header basic auth excluding function paths). Event-triggered functions likewise fail with full Password Protection.
- Endpoint names are case-sensitive. Functions directory must stay out of the publish directory.
- `Netlify.context` is `null` outside the handler. No return value → `204`.
- AWS Lambda env property limits apply to env vars.

## Lambda-compat API (legacy) and Go

Opt in with a **named `handler` export**. Docs recommend migrating to the modern API (https://developers.netlify.com/guides/migrating-to-the-modern-netlify-functions/). **Go must use this API.**

```ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  return {
    body: JSON.stringify({ message: "Hello World" }),
    statusCode: 200,
  }
}
```

- `event`: `{ path, httpMethod, headers, queryStringParameters, body, isBase64Encoded }`. Parse `multipart/form-data` with busboy. `context.clientContext` carries Identity info.
- Response: `{ isBase64Encoded, statusCode, headers, multiValueHeaders, body }`. Always return at least a status code; `async` alone does not make a function a background function.
- CommonJS: `exports.handler = async function (event, context) { ... }`. Recommended tsconfig: `esModuleInterop`, `verbatimModuleSyntax`. File extensions `.ts`/`.js`.
- Streaming: wrap with `stream` from `@netlify/functions` and return `body: <ReadableStream>` (e.g. `body: res.body` to pipe upstream SSE) with `statusCode: 200`.
- Background: `BackgroundHandler` type; `-background` suffix; return value unused.

Identity claims access:

```ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async function (event: HandlerEvent, context: HandlerContext) {
  const rawNetlifyContext = context.clientContext.custom.netlify;
  const netlifyContext = Buffer.from(rawNetlifyContext, 'base64').toString('utf-8');
  const { identity, user } = JSON.parse(netlifyContext);
  // identity.url = GoTrue API endpoint; identity.token = short-lived admin token
  // user = decoded JWT claims (present when Authorization: Bearer <token> is valid)
};

export { handler };
```

Go (AWS Lambda Go runtime; dedicated subdirectory; compile for `GOOS=linux GOARCH=amd64`):

```go
package main

import (
  "github.com/aws/aws-lambda-go/events"
  "github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayProxyRequest) (*events.APIGatewayProxyResponse, error) {
  return &events.APIGatewayProxyResponse{
    StatusCode: 200,
    Body:       "Hello, World!",
  }, nil
}

func main() {
  lambda.Start(handler)
}
```

For `ClientContext`, add a `context.Context` first parameter and use `lambdacontext.FromContext(ctx)`. Next.js sites use advanced API routes for background functions with a different endpoint form.

<!--
Gaps and conflicts in the intermediate (preserved, not resolved from outside knowledge):
- Execution-limit conflict: overview says 60 s for synchronous functions including scheduled; scheduled-functions page says 30 s for scheduled. Docs don't state which is authoritative.
- Background Functions plan gating conflicts: resolved pricing banner (Credit-based Free/Personal/Pro + Enterprise; legacy Pro until 2025-12-15) vs usage-and-billing body ("Core Pro and Enterprise"). Banner treated as source of truth per manifest.
- The backgroundFunctions pricing message ends with a bare "Learn more." with no link target.
- Docs print `@monthly` as `0 0 1 * -` (likely a typo for `0 0 1 * *`); omitted the expansion above rather than propagate it.
- The docs' modern-API OpenAI/Groq streaming examples reference an undefined `event.queryStringParameters` and an undefined `body` (stale Lambda-era code); not reproduced verbatim here — the corrected pattern (return `res.body` / wrapped ReadableStream) is described instead.
- Default region for sites created before 2023-10-04 is not stated in the docs.
- No stated preference/precedence between `process.env` and `Netlify.env` for runtime env access.
- Event payload object shapes (deploy, form submission, split test) are not fully specified beyond the top-level {payload, site} wrapper.
-->

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
