---
name: netlify-config
description: Reference for netlify.toml configuration and site environment variables. Use when configuring build settings, redirects, rewrites, headers, deploy contexts, the `[dev]` block that controls `netlify dev` (command, port, targetPort, framework), or any site-level configuration — and when managing environment variables or secrets with the Netlify CLI, including scoping values to specific deploy contexts. Covers the complete netlify.toml syntax including redirects with splats/conditions, headers, deploy contexts, functions config, edge functions config, and the `[dev]` block (including when `framework` must be `"#custom"` — required when both a custom `command` and `targetPort` are set).
---

# Netlify Configuration (netlify.toml)

Place `netlify.toml` at the repository root. In a monorepo, Netlify searches for the config and uses the **first** one it finds: the package directory (the subdirectory containing the site), then the base directory, then the repository root — so put a site-specific `netlify.toml` in the package directory to take precedence over root-level config (see the **netlify-deploy** skill's monorepo notes).

**`netlify.toml` takes precedence over the Netlify UI.** When the same property (build command, publish directory, an environment variable, a redirect, a header) is configured in both places, the value in `netlify.toml` wins and silently overrides the corresponding Netlify UI setting — the dashboard field still shows its old value but is inert. Once a `netlify.toml` is present, treat it as the source of truth and change settings there, not in the UI.

## Build Settings

```toml
[build]
  base = "project/"          # Base directory (default: root)
  command = "npm run build"  # Build command
  publish = "dist/"          # Output directory
```

## Redirects

```toml
# Basic redirect
[[redirects]]
from = "/old"
to = "/new"
status = 301              # 301 (default), 302, 200 (rewrite), 404

# SPA catch-all
[[redirects]]
from = "/*"
to = "/index.html"
status = 200

# Splat (wildcard)
[[redirects]]
from = "/blog/*"
to = "/news/:splat"

# Path parameters
[[redirects]]
from = "/users/:id"
to = "/api/users/:id"
status = 200

# Force (override existing files)
[[redirects]]
from = "/app/*"
to = "/index.html"
status = 200
force = true

# Proxy to external service
[[redirects]]
from = "/api/*"
to = "https://api.example.com/:splat"
status = 200
[redirects.headers]
  X-Custom = "value"

# Country/language conditions
[[redirects]]
from = "/*"
to = "/fr/:splat"
status = 200
conditions = { Country = ["FR"], Language = ["fr"] }
```

**Rule order matters** — Netlify processes the first matching rule. Place specific rules before general ones.

Redirect rules can also live in a plain-text `_redirects` file in the publish directory. If both a `_redirects` file and `[[redirects]]` in `netlify.toml` exist, the `_redirects` file rules are processed **first**, then the `netlify.toml` rules, reading top to bottom — and the first matching rule wins. The same ordering applies to a `_headers` file versus `[[headers]]`. Because a `_redirects` rule can silently shadow a `netlify.toml` rule for the same path, keep overlapping rules in a single source.

## Headers

```toml
[[headers]]
for = "/*"
[headers.values]
  X-Frame-Options = "DENY"
  X-Content-Type-Options = "nosniff"

[[headers]]
for = "/assets/*"
[headers.values]
  Cache-Control = "public, max-age=31536000, immutable"
```

Headers apply only to files served from Netlify's CDN (not to function or edge function responses — set those in code).

## Deploy Contexts

Override settings per deploy context:

```toml
[context.production]
command = "npm run build"
environment = { NODE_ENV = "production" }

[context.deploy-preview]
command = "npm run build:preview"

[context.branch-deploy]
command = "npm run build:staging"

[context.dev]
environment = { NODE_ENV = "development" }

# Specific branch
[context."staging"]
command = "npm run build:staging"
```

**`[[redirects]]` and `[[headers]]` are global — they cannot be scoped to a deploy context.** Context tables like `[context.production]` work for keys such as `[build]`, `[build.environment]`, and `[[plugins]]`, but redirect and header rules apply to every context no matter where you place them in the file; there is no `[context.production.redirects]` or context-nested `[[redirects]]`. For context-specific redirects or headers, use the per-deploy escape hatch: generate a `_redirects` or `_headers` file during that context's build (those files ship per deploy), or gate the behavior on a runtime signal in an edge function.

## Environment Variables

```toml
[build.environment]
NODE_VERSION = "20"

[context.production.environment]
API_URL = "https://api.prod.com"

[context.deploy-preview.environment]
API_URL = "https://api.staging.com"
```

**Do not put secrets in netlify.toml** (it's committed to source control). Use the Netlify UI or CLI for sensitive values — see CLI Management below.

**Variables declared in `netlify.toml` are build-scoped only.** Values under `[build.environment]` or `[context.*.environment]` are available to the build (and snippet injection) but are **not** injected into the Functions or Edge Functions runtime — reading them with `Netlify.env.get("VAR")` or `process.env.VAR` inside a function returns `undefined`. To make a variable available at function runtime, set it in the Netlify UI or with `netlify env:set` (those are available to both builds and runtime), not in `netlify.toml`.

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
netlify env:list --plain > .env   # Local snapshot only — keep .env gitignored, never commit it

# Import from file
netlify env:import .env

# Delete
netlify env:unset API_KEY
```

**Never put secrets in client-prefixed variables** (`VITE_`, `PUBLIC_`, `NEXT_PUBLIC_`, `NUXT_PUBLIC_`) — these are inlined into the client bundle and exposed to the browser. `--secret` only hides a value from logs and the UI; it does not protect a client-prefixed variable.

### Context Scoping

Variables set via the CLI can also be scoped to deploy contexts:

```bash
netlify env:set API_URL "https://api.prod.com" --context production
netlify env:set API_URL "https://api.staging.com" --context deploy-preview
netlify env:set DEBUG "true" --context branch:feature-x
```

This is the CLI equivalent of the `[context.*.environment]` tables above, but the resulting variables are available at both build and runtime (unlike `netlify.toml`-declared ones).

When reading these variables in server code, prefer `Netlify.env.get("VAR")`. `process.env.VAR` also works inside Functions, but Edge Functions expose only `Netlify.env.get` — the portable form keeps the same code working in both runtimes.

For the client-side rules (`VITE_`/`PUBLIC_` prefixes and framework specifics), see the **netlify-frameworks** skill; for function-side details, see **netlify-functions**.

## Functions Configuration

```toml
[functions]
directory = "netlify/functions"   # Default
node_bundler = "esbuild"

# Scheduled function
[functions."cleanup"]
schedule = "@daily"
```

Use the single-table `[functions]` form for global settings and `[functions."name-or-glob"]` for per-function overrides. There is **no** `[[functions]]` array-of-tables and no path-based function routing table in `netlify.toml` — functions are routed by file (served at `/.netlify/functions/{name}`) or by an in-code `path`/`config` export, not by config.

## Edge Functions Configuration

```toml
[[edge_functions]]
path = "/admin/*"
function = "auth"
excludedPath = "/admin/public/*"   # Carve exceptions out of `path` (string or array of globs)

# Import map for Deno URL imports
[functions]
deno_import_map = "./import_map.json"
```

## Dev Server

```toml
[dev]
command = "npm start"       # Dev server command
port = 8888                 # Netlify Dev port
targetPort = 3000           # Your app's dev server port
framework = "#auto"         # "#auto", "#static", "#custom"
```

**If you set both a custom `command` and a `targetPort`, `framework` must be `"#custom"`.** With `framework = "#auto"` (the default) Netlify Dev runs its own detector and ignores your custom `command`; `"#custom"` tells it to run your `command` as the app server and connect to `targetPort`. Setting `command` + `targetPort` while leaving `framework` at `#auto` (or omitting it) is a silent misconfiguration.

## Plugins

```toml
[[plugins]]
package = "@netlify/plugin-lighthouse"
[plugins.inputs]
  audits = ["performance", "accessibility"]
```

## Image CDN

```toml
[images]
remote_images = ["https://example\\.com/.*"]
```

See the **netlify-image-cdn** skill for full Image CDN usage.
