---
name: netlify-config
description: Configure Netlify projects via netlify.toml and the _headers/_redirects files — covering build settings and deploy contexts alongside environment variables/scopes and the Secrets Controller plus redirect/rewrite/proxy and custom-header rules. Use when setting a build command or publish directory, adding redirect or rewrite or proxy rules, configuring custom headers or basic auth, setting or scoping environment variables and secrets, wiring up a monorepo or SPA fallback, or skipping unnecessary builds. Reach for this whenever you touch netlify.toml or ask "why is my env var undefined in a function" or "how do I redirect this path".
---

# Netlify configuration

`netlify.toml` lives at the repo root (or set `base`/package directory for monorepos). Settings in `netlify.toml` **override** the Netlify UI on conflict. `_headers` and `_redirects` are extensionless plain-text files in the **publish directory**, processed **before** `netlify.toml` rules.

## Footguns (read first)

- **Env vars in `netlify.toml` are NOT available to functions or edge functions at runtime** — reading them there returns `undefined`. Vars declared in `netlify.toml` only get the **Builds** and **Post processing** scopes. Set runtime vars in the UI or with `netlify env:set`.
- **Never put secrets in client-prefixed vars** (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, …) — they are inlined into the client bundle. `--secret` does not protect them.
- **`.env` is not read by the Netlify build system** — import variables into Netlify first (`netlify env:import`). The CLI reads `.env` only for local builds.
- **Direct env injection into `netlify.toml` (`key = "$VAR"`) is unsupported** — except signed proxy redirects. Use a build plugin or `sed` in the build command.
- **`[[redirects]]` and `[[headers]]` are global** — NOT context-aware, cannot be scoped to branches/contexts. Workaround: per-context build command copies a custom file into the publish directory.
- **Proxy rewrites time out at 26 seconds.** HTTP `307` is unsupported — use `302`.

## `netlify.toml` — core structure

```toml
[build]
  base = "project/"          # base directory
  publish = "build-output/"  # relative to base, default /
  command = "npm run build"  # runs in Bash shell
  [build.environment]
    NODE_VERSION = "18"

[context.production]         # production branch deploy
  command = "make publish"
  environment = { NODE_VERSION = "14.15.3" }
[context.deploy-preview]     # PR/MR previews
  publish = "dist/"
[context.branch-deploy]      # non-production branches
  command = "echo branch"
[context.dev.environment]    # local dev env vars ONLY
  NODE_ENV = "development"
[context.staging]            # a specific branch name
  command = "echo staging"
[context."feat/branch"]      # quote branches with special chars
  command = "echo special"
```

Context precedence (least → most specific): UI settings < base context-aware key < `[context.production|deploy-preview|branch-deploy|dev]` < `[context.branchname]`. Only `[build]` and `[[plugins]]` are context-aware. All paths are absolute relative to the base directory (root `/` default).

Config file search order: package directory → base directory → root.

## Functions config

```toml
[functions]
  directory = "functions/"           # default: YOUR_BASE_DIR/netlify/functions
  node_bundler = "esbuild"           # prefer esbuild; zisi is the JS default
  external_node_modules = ["package-1"]
  included_files = ["files/*.md", "!files/skip.md"]

[functions."api_*"]                  # glob filter; values CONCATENATE across matches
  external_node_modules = ["package-2"]
```

- `esbuild` = smaller/faster artifacts; TypeScript functions **always** use `esbuild`.
- `external_node_modules` applies only with `esbuild`. `included_files`: `*` wildcard, `!` excludes; paths absolute to base.

## Environment variables

Set runtime/scoped vars via CLI/UI/API (not `netlify.toml`):

```sh
netlify env:set MY_KEY value --secret     # --secret marks an env var secret
netlify env:import .env                    # site-level, all scopes, all contexts
netlify env:list --plain --context production > .env
netlify env:unset MY_KEY
```

**Keep any `.env` snapshot gitignored — never commit it.**

**Types:** site vars (one site) vs shared vars (whole team; Pro/Enterprise; Team Owners only).

**Scopes** (Pro/Enterprise; default = all): **Builds**, **Functions** (also Edge Functions + On-demand Builders), **Runtime** (forms, signed proxy redirects), **Post processing** (snippet injection). Vars from `netlify.toml` are locked to **Builds** + **Post processing**.

**Scope precedence is independent per scope:** a site variable scoped only to Builds does NOT shadow a shared variable for the Functions scope — the shared value still applies there. Site beats shared only within the scopes the site variable actually carries.

**Deploy-context values:** `Production`, `Deploy Previews`, `Branch deploys` (override per-branch with a `Branch` value, wildcard suffix `release/*`), `Preview server`, `Local development`.

**Overrides:** `netlify.toml` vars override same-key UI/CLI/API vars. Site var beats shared var per its scopes/contexts.

**Limits:** keys ≤ 255 chars, alphanumeric + underscore, first char a letter (`KEY1` ok; `1KEY`/`_KEY1` invalid). Values ≤ 5,000 chars (functions within AWS limits). Reserved read-only names can't be overridden.

### Build variables

Settable in `netlify.toml` `[build.environment]`: `NODE_VERSION`, `NODE_ENV`, `NPM_VERSION`, `NPM_FLAGS`, `NPM_TOKEN`, `YARN_VERSION`, `PNPM_FLAGS`, `BUN_VERSION`, `RUBY_VERSION`, `PHP_VERSION`, `PYTHON_VERSION`, `GO_VERSION`, `HUGO_VERSION`, `NETLIFY_USE_YARN`, `CI`, etc.

**Set in UI/CLI only (NOT `netlify.toml`, which is read after clone):** `AWS_LAMBDA_JS_RUNTIME`, `GIT_LFS_ENABLED`, `GIT_LFS_FETCH_INCLUDE`, `NETLIFY_BUILD_DEBUG`.

Read-only build metadata (examples): `NETLIFY`, `BUILD_ID`, `CONTEXT` (`production`/`deploy-preview`/`branch-deploy`/`dev`), `BRANCH`, `HEAD`, `COMMIT_REF`, `CACHED_COMMIT_REF`, `PULL_REQUEST`, `REVIEW_ID`, `URL`, `DEPLOY_URL`, `DEPLOY_PRIME_URL`, `DEPLOY_ID`, `SITE_NAME`, `SITE_ID`, `ACCOUNT_ID`.

Access: Bash `$VAR_NAME` in build/ignore commands; `process.env.VAR_NAME` in Node scripts and plugins. Scope must include **Builds**.

### Inject env values into headers/redirects

```toml
[build]
  command = "sed -i \"s|HEADER_PLACEHOLDER|${PROD_API_LOCATION}|g\" netlify.toml && yarn build"
```

Substitution only reaches `[[headers]]`/`[[redirects]]` (read after build); NOT available to build plugins. Alternatively mutate `netlifyConfig` in a local build plugin.

## Redirects & rewrites

`_redirects` (one rule per line) or `[[redirects]]`. Rules process top-down; first match wins. `_redirects`/file rules run before `netlify.toml`.

```
/home            /                301
/my-redirect     /                302
/store id=:id    /blog/:id        301
/news/*          /blog/:splat
/*               /index.html      200          # SPA fallback
```

```toml
[[redirects]]
  from = "/old-path"
  to = "/new-path"
  status = 302              # default 301
  force = true             # default false; shadow an existing URL
  query = { id = ":id" }
  conditions = { Language = ["en"], Country = ["US"], Role = ["admin"] }
  [redirects.headers]
    X-From = "Netlify"
```

- **Force/shadow:** you can't shadow an existing URL by default — append `!` in `_redirects` or `force = true` in toml.
- **Splats** (`*`) only at the end of a path segment (`/jobs/*.html` won't work). Can't exclude a path from a splat — order a more specific rule first.
- **Query:** `id=:id` matches URLs with *only* `id` and no other params. List optional-param variants most-general-last.
- **Trailing slash:** URLs are normalized before rules run; you cannot add/remove a trailing slash via a redirect (infinite loop). Pretty URLs (on by default) handle standardization.
- **Country/Language conditions:** no spaces (`Country=au,nz`). `Country` = ISO 3166-1 alpha-2; `Language` = browser/locale codes, matches the FIRST `Accept-Language` entry. `nf_country`/`nf_lang` cookies override.
- **Domain redirects:** HTTP and HTTPS need separate rules unless forcing SSL; the domain must be assigned to the site.
- Role-based redirects with external auth: Enterprise only. HTTP `307` unsupported → use `302`.
- **10,000+ redirects:** favor wildcards/placeholders; serialization across `_redirects` + `netlify.toml` can fail the deploy if too large — consider Edge Functions.

### Rewrites & proxies (status 200)

```
/api/*            https://api.example.com/:splat        200
/netlify-site/*   https://my-other-site.netlify.app/:splat  200
```

```toml
[[redirects]]
  from = "/search"
  to = "https://api.mysearch.com"
  status = 200
  force = true
  headers = { X-From = "Netlify" }
```

- No cross-team rewrites between Netlify sites. Infinite-loop rules (from == to) are ignored.
- Internal rewrites limited to one hop. Proxy timeout **26s** — use async for longer. Rewrites break relative-path assets — use absolute paths or `<base>`.
- Proxy to another Netlify site: use its `.netlify.app` subdomain. Rewrites into a separate password-protected site are not allowed.

### Signed proxy redirects (`netlify.toml` only)

```toml
[[redirects]]
  from = "/search"
  to = "https://api.mysearch.com"
  status = 200
  force = true
  signed = "API_SIGNATURE_TOKEN_PLACEHOLDER"
```

Must be in `netlify.toml`; env var scope must include **Runtime**; not supported proxying Netlify→Netlify. Netlify sends the JWS as HMAC HS256 in the `x-nf-sign` header. (This is the one place `$VAR`-style env injection is allowed.)

## Custom headers

```
/*
  X-Frame-Options: DENY
  cache-control: max-age=0
  cache-control: no-cache          # multi-value collapses comma-joined
```

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    Basic-Auth = "someuser:somepassword anotheruser:anotherpassword"
    cache-control = '''
    max-age=0,
    no-cache,
    no-store'''
```

- **Headers apply only to files Netlify serves from its own store** — proxied content, functions, and edge/SSR pages must return their own headers.
- Reserved header names Netlify controls (ignored if you set them): `Content-Length`, `Content-Encoding`, `Location` (use redirects), `Set-Cookie` (may be overridden), `Server`, `Date`, `Age`, `Connection`, `Transfer-Encoding`, etc.
- Basic-Auth headers: Pro/Enterprise. Cross-subdomain cookies impossible on `*.netlify.app` (Public Suffix List) — needs a custom domain.
- Global only; per-branch via the build-command copy workaround.

## Secrets Controller

Mark a var secret via `--secret` (CLI), `is_secret: true` (API), or the UI. Enforced, non-customizable policy:

- Values are **write-only** — no readable version after setting; the flag can't be removed to reveal a value.
- Must be set to explicit deploy contexts and scopes; **cannot** have the `post processing` scope.
- Only code on Netlify reads unmasked values; outside code gets masked. The `dev` context value is unmasked and exempt.
- Secret scanning (smart detection: Personal/Pro/Enterprise) runs on the next build after marking a var secret. Resolve a detection by removing the value at the location in the deploy log, then redeploy. Safelist false positives via `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` (comma-separated), then redeploy.

**Sensitive variable policy (public repos only):** untrusted deploys (unrecognized authors) default to **Require approval**; alternatives are **Deploy without sensitive variables** or **Deploy without restrictions**. Not available for GitHub Enterprise Server / GitLab self-managed (treated as private).

## Ignore builds

```toml
[build]
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF packages/blog"
```

- Exit `0` = no changes, **build stops**; exit `1` = changed, build continues.
- Runs from base directory; uses fixed **Node.js 18** (not customizable); site `package.json` deps unavailable. Referenced file paths must start with `./`.
- Won't cancel a build triggered by a build hook, regardless of exit code.

Node.js variant:
```js
// ignore_build.js — build only non-debug branches
process.exitCode = process.env.BRANCH.includes("debug") ? 0 : 1
```

## JavaScript SPAs

```toml
[build]
  command = "npm run build"
  publish = "dist"        # varies by framework
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200            # required for pushState routing to avoid 404s
```

Hashed/code-split filenames + atomic deploys can break asset refs (`Uncaught SyntaxError: Unexpected token`) — disable hashed filenames, use permalinks, or a service worker.

## Monorepos

Recommended: set the site's subdirectory as the **package directory** (keep `netlify.toml` there), leave base directory at repo root `/`, declare deps at the subdirectory level.

- **Package directory is UI-only** (Build settings > Configure) — it cannot be set in `netlify.toml`. Base directory can be set in root-level `netlify.toml` (`[build] base`) and overrides the UI.
- Use absolute paths relative to base: base `/frontend` + plugin at `/frontend/packages/my-app/plugins` → specify `/packages/my-app/plugins/...`.
- Build only on subdirectory changes with an `ignore` command. CLI: `--filter <site>`. Netlify caches all `node_modules` regardless of where deps are declared.

## Plugins, extensions, dev, templates

```toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"
  [plugins.inputs]
    breeds = ["pomeranian"]

[[integrations]]           # extensions; install on team first
  name = "abc-performance-extension"
  [integrations.config]
    output_path = "reports/perf.html"

[dev]                      # Netlify Dev — NOT run in Bash; no `environment` key here
  command = "yarn start"
  targetPort = 3000        # if command + targetPort both set, framework must be "#custom"
  port = 8888
  publish = "dist"
  [dev.https]
    certFile = "cert.pem"
    keyFile = "key.pem"
```

`[dev]` has **no `environment` property** — set local env vars in `[context.dev.environment]` instead. `framework` values: `#auto` (default), `#static`, `#custom`.

For Deploy-to-Netlify buttons use `[template]` / `[template.environment]`.

Post-processing pretty URLs:
```toml
[build.processing.html]
  pretty_urls = true
```

<!-- TOML syntax reference: https://toml.io/en/ · Netlify config docs: https://docs.netlify.com/build/configure-builds/file-based-configuration.md -->

<!-- system: agent-context/config/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (config)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. Env vars set in `netlify.toml` are NOT available to functions or edge
   functions at runtime — reading them there returns `undefined`. Set
   runtime vars in the UI or with `netlify env:set`, not `netlify.toml`.
2. Never put secrets in client-prefixed env vars (`VITE_`, `NEXT_PUBLIC_`,
   `PUBLIC_`, ...) — they are inlined into the client bundle; `--secret`
   does not protect them.
3. When snapshotting env vars locally (`netlify env:list --plain > .env`),
   keep `.env` gitignored — never commit it.
4. State env-var scope interaction explicitly: a site variable scoped to
   Builds does not shadow the shared variable for other scopes — precedence
   resolves independently per scope (site beats shared only within the
   scopes the site variable actually carries).
