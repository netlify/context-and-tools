---
name: netlify-edge-functions
description: Guide for writing Netlify Edge Functions. Use when building middleware, geolocation-based logic, request/response manipulation, authentication checks, A/B testing, or any low-latency edge compute. Covers Deno runtime, context.next() middleware pattern, geolocation, and when to choose edge vs serverless.
---

# Netlify Edge Functions

Edge functions run on Netlify's globally distributed edge network (Deno runtime), providing low-latency responses close to users.

## Check the framework adapter first

For framework projects, check the framework reference (the **netlify-frameworks** skill) before hand-writing an edge function — framework adapters emit their own edge middleware, so the behavior you need may already be generated. A custom edge function that duplicates adapter-generated middleware causes conflicts.

## Syntax

```typescript
import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  return new Response("Hello from the edge!");
};

export const config: Config = {
  path: "/hello",
};
```

Place files in `netlify/edge-functions/`. Uses `.ts`, `.js`, `.tsx`, or `.jsx` extensions.

## Config Object

```typescript
export const config: Config = {
  path: "/api/*",                    // URLPattern path(s)
  excludedPath: "/api/public/*",     // Exclusions
  method: ["GET", "POST"],           // HTTP methods
  onError: "bypass",                 // "fail" (default), "bypass", or "/error-page"
  cache: "manual",                   // Enable response caching
};
```

**Scope `path` narrowly — `path: "/*"` intercepts every request, including static assets.** A `/*` match runs the edge function on every CSS, JS, image, and font request, not just your HTML pages — adding latency to each asset and billing an edge invocation for it. Match only the routes you need (e.g. `path: "/"`, `path: "/app/*"`), or keep a broad path but exclude static assets with `excludedPath` (e.g. `excludedPath: ["/*.css", "/*.js", "/*.png", "/*.woff2"]`).

**Cache headers on an edge response do nothing without `cache: "manual"`.** Setting `Cache-Control` (or any cache header) on the `Response` an edge function returns has no effect unless the function also opts in with `config.cache = "manual"`. It's both or neither: without the flag the response is never cached, no matter what headers you set.

## Declaring edge functions: inline config vs netlify.toml

An edge function runs only if it is bound to a path. Bind it either with an inline `export const config = { path: ... }` in the function file (shown above), or with an `[[edge_functions]]` entry in `netlify.toml` that names the file:

```toml
[[edge_functions]]
  path = "/admin/*"
  function = "auth"        # runs netlify/edge-functions/auth.ts
```

**A file in `netlify/edge-functions/` with no path binding still deploys, but silently never runs.** There is no build error and no warning — nothing routes a request to it, so it is never invoked. If an edge function "isn't doing anything," first confirm it declares a `path` inline or has a matching `[[edge_functions]]` entry.

### Chaining multiple edge functions on one path

When several edge functions match the same path, they run as a chain in this order:

1. Functions declared in `netlify.toml` run first, **in the order they appear** in the file (top to bottom).
2. Functions declared inline (via `export const config`) run next, **in alphabetical order by filename**.
3. Functions configured for caching (`cache: "manual"`) always run after non-caching ones.

To guarantee a specific order (e.g. an auth gate that must run before a personalization rewrite), declare the functions in `netlify.toml` in the order you want — don't depend on inline config, whose order is alphabetical by filename and easy to get wrong. Declaring the same function both inline and in `netlify.toml` merges them into an inline declaration (inline config wins), which forfeits the deterministic `netlify.toml` ordering.

## Edge functions run before redirects

In Netlify's request chain, edge functions execute **before** redirect and rewrite rules (`[[redirects]]`, `_redirects`). Two consequences bite often:

- An edge function is matched against the **original** requested URL, not a redirect/rewrite destination. Scope its `path` to the URL the client actually requests — an edge function declared on the *target* of a rewrite will not fire for requests that only reach that target via the rewrite.
- If an edge function returns a `Response`, the request chain stops there and redirect rules for that path **never run**. Return `context.next()` (or `undefined`) if you want redirects to still apply.

## Middleware Pattern

Use `context.next()` to invoke the next handler in the chain and optionally modify the response:

```typescript
export default async (req: Request, context: Context) => {
  // Before: modify request or short-circuit
  if (!isAuthenticated(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Continue to origin/next function
  const response = await context.next();

  // After: modify response
  response.headers.set("x-custom-header", "value");
  return response;
};
```

Return `undefined` to pass through without modification:

```typescript
export default async (req: Request, context: Context) => {
  if (!shouldHandle(req)) return; // continues to next handler
  return new Response("Handled");
};
```

## Geolocation and IP

```typescript
export default async (req: Request, context: Context) => {
  const { city, country, subdivision, timezone } = context.geo;
  const ip = context.ip;

  if (country?.code === "DE") {
    return Response.redirect(new URL("/de", req.url));
  }
};
```

Local dev with mocked geo: `netlify dev --geo=mock --country=US`

## Cookies

Read and write cookies through the `context.cookies` helper instead of hand-parsing the `Cookie` header or building `Set-Cookie` strings:

```typescript
export default async (req: Request, context: Context) => {
  const bucket = context.cookies.get("bucket");            // read from the request
  context.cookies.set({ name: "bucket", value: "a" });     // set on the response
  context.cookies.delete("legacy_session");                // tell the client to delete it
  return context.next();
};
```

- `cookies.get(name)` — reads a named cookie from the incoming request.
- `cookies.set(options)` — sets a cookie on the outgoing response (same option shape as the web `CookieStore.set` standard).
- `cookies.delete(name)` — instructs the client to delete the cookie.

## Environment Variables

Use `Netlify.env` (not `process.env` or `Deno.env`):

```typescript
const secret = Netlify.env.get("API_SECRET");
```

## Module Support

- **Node.js builtins**: `import { randomBytes } from "node:crypto";`
- **npm packages**: Install via npm and import by name
- **Deno modules**: URL imports (e.g., `import X from "https://esm.sh/package"`)

For URL imports, use an import map:

```json
// import_map.json
{ "imports": { "html-rewriter": "https://ghuc.cc/worker-tools/html-rewriter/index.ts" } }
```

```toml
# netlify.toml
[functions]
  deno_import_map = "./import_map.json"
```

## When to Use Edge vs Serverless

| Use Edge Functions for | Use Serverless Functions for |
|---|---|
| Low-latency responses | Long-running operations (up to 15 min) |
| Request/response manipulation | Complex Node.js dependencies |
| Geolocation-based logic | Database-heavy operations |
| Auth checks and redirects | Background/scheduled tasks |
| A/B testing, personalization | Tasks needing > 512 MB memory |

## Limits

| Resource | Limit |
|---|---|
| CPU time | 50 ms per request |
| Memory | 512 MB per deployed set |
| Response header timeout | 40 seconds |
| Code size | 20 MB compressed |
