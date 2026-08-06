---
name: netlify-deploy
description: Deploy, host, and publish web projects on Netlify with the Netlify CLI. Use when the user wants to deploy a site or repository to Netlify, link a local project to a Netlify site, ship a production or preview/draft deploy, set up Git-based continuous deployment, run a manual or local deploy, configure CI deploys, or troubleshoot a failed or misconfigured deploy. Also use to view or tail a deployed site's runtime logs — function and edge-function output, deploy logs — via `netlify logs` when debugging what a live site is doing (recent errors, recent activity, streaming output).
---

# Netlify Deployment

Install the CLI, link a project to a Netlify site, and deploy it — either through Git-based continuous deployment (the primary path) or a manual CLI upload (for prototypes and CI). Environment-variable management lives in the **netlify-config** skill; local development lives in the **netlify-frameworks** skill.

## Installation

```bash
npm install -g netlify-cli    # Global (for local dev)
npm install netlify-cli -D    # Local (for CI)
```

Requires Node.js 18.14.0+. You can also invoke the CLI without installing it using `npx netlify <command>`.

## Authentication

```bash
netlify login       # Opens browser for OAuth
```

For CI, set the `NETLIFY_AUTH_TOKEN` environment variable instead of logging in interactively. Generate a token from **User settings → Applications → Personal access tokens** in the Netlify UI.

**CI also needs a site to target.** `NETLIFY_AUTH_TOKEN` only authenticates you — it does **not** select which site a deploy publishes to. In CI there is no linked `.netlify/state.json`, so also set `NETLIFY_SITE_ID` (the site's API/Project ID, shown as **Project ID** in the site's configuration) as an environment variable so `netlify deploy` knows where to publish. Without it, a CI deploy has no site to target and fails or tries to prompt. Locally this is handled by `netlify link`, which writes the site ID into `.netlify/state.json`; CI has no such file.

Don't pre-check auth as a separate step. Run the real operation (`netlify deploy`, `netlify link`) directly; only if it fails with an authentication error do you surface `netlify login` (or setting `NETLIFY_AUTH_TOKEN`) as the fix.

## Linking a Site

Linking connects the local directory to a Netlify site and writes the site ID into `.netlify/state.json`.

```bash
# Interactive — pick an existing site
netlify link

# By Git remote (if the project has one)
netlify link --git-remote-url https://github.com/org/repo

# Create a new site
netlify init           # With Git CI/CD setup
netlify init --manual  # Without Git CI/CD
```

Run `netlify link` directly rather than pre-checking link status. If the command reports the project isn't linked to any site (or the site can't be found), that failure is the signal to link or create one with `netlify link` / `netlify init`.

**Always add `.netlify` to `.gitignore`** — every linking path (`netlify link`, `netlify init`, `netlify init --manual`) writes site state to `.netlify/state.json`, which shouldn't be committed. Mention this whenever you link or create a site.

## Deploying

### Git-Based Deploys (Continuous Deployment) — primary path

The standard way to deploy on Netlify is to connect the site to a Git repository (set up with `netlify init`, or in the UI). Netlify then builds and deploys automatically on every push:

- **Push to the production branch → production deploy.**
- **Open a pull request → deploy preview** with its own unique URL.
- **Push to other branches → branch deploy**, but **only if branch deploys are enabled** — they are off by default. Turn them on (per branch or for all branches) in the site's build & deploy settings.

The build runs on Netlify's servers, not your machine. Configure build settings (command, publish directory, base directory) in `netlify.toml` — see the **netlify-config** skill for the full configuration reference.

**`netlify.toml` overrides the UI.** File-based configuration in `netlify.toml` takes precedence over the equivalent build settings configured in the Netlify UI. When the same option is set in both places, the committed `netlify.toml` wins — editing that setting in the dashboard has no effect until you change the file and redeploy. This surprises people who tweak the build command, publish directory, or base directory in the UI and watch the old committed value keep applying on every deploy.

**Monorepo config discovery order.** In a monorepo, Netlify searches for the `netlify.toml` in this order and uses the **first** one it finds: (1) the package directory, then (2) the base directory, then (3) the repository root. Put a site-specific `netlify.toml` in the package directory (the subdirectory that contains that site) so it takes precedence over any root-level config. A base directory set in a root-level `netlify.toml` also overrides the base directory configured in the UI.

**The publish directory is resolved relative to the base directory.** When a `base` directory is configured, the publish directory is interpreted relative to that base, **not** the repository root. A top-level `publish = "dist"` combined with `base = "apps/web"` publishes `apps/web/dist`, not `dist` at the repo root. Set `publish` relative to the base so the built output is found.

### Manual / Local Deploys (No Git Required) — secondary path

Build the site, then upload the output directly with the CLI. This bypasses Netlify's build servers and is the right tool for prototypes, local-only projects with no Git remote, or a CI pipeline that builds elsewhere and uploads the artifact.

```bash
netlify deploy             # Draft deploy (preview URL)
netlify deploy --prod      # Production deploy
netlify deploy --dir=dist  # Specify the directory to upload
```

For sites with Git continuous deployment connected, prefer pushing to Git — a manual upload is the exception, not the default.

**A manual `--prod` deploy is replaced by the next Git push.** If the same site also has Git continuous deployment connected, the next push to the production branch triggers a new build that auto-publishes and **replaces** your manually shipped `--prod` deploy — the hand-shipped build silently disappears from production. To keep a specific deploy live, **lock the published deploy** ("Stop auto publishing") from the site's Deploys list in the UI: while locked, new pushes still build but do not auto-publish until you unlock or manually publish. Mixing manual `--prod` deploys with Git CD on the same production branch is otherwise a race the next commit wins.

### Deploy URLs are public by link

Draft deploys (`netlify deploy`), Deploy Previews, branch deploys, and deploy permalinks each get a **unique URL that anyone with the link can open** — they are not private just because the URL is unguessable and unlisted. Don't treat a preview URL as a safe place for confidential or unreleased content on that basis alone. To actually restrict access, enable site protection in the UI (Password Protection, or Team/SSO protection). You can scope that protection to all deploys, or to non-production deploys only (Deploy Previews and branch deploys) while leaving production open. See the **netlify-access-control** skill for the full picture.

## When a command fails, surface and stop

When a `netlify` command or a deploy fails, **report the failure to the user** with the exact error, the deploy log URL (the CLI prints one), and the affected site/branch — and stop. Do not invent recovery commands or escalate to lower-level tools: do not curl `https://api.netlify.com/...`, do not run `netlify api <method>` as a recovery hatch, and do not read auth tokens off disk to force the operation through. If the documented happy path is broken, that's a platform-state problem the user needs to see.

## Error Handling

Common issues and what to do:

**"Not logged in"**
→ Run `netlify login` (or set `NETLIFY_AUTH_TOKEN` in CI).

**"No site linked"**
→ Run `netlify link` (existing site) or `netlify init` (new site).

**"Build failed" / "Function bundling failed" / deploy marked failed**
→ A failed deploy does **not** publish — the site keeps serving the last successful deploy, so it isn't down, and there's nothing to "roll back." The only way to get the new code live is to fix the failure and redeploy.
→ Get the exact error from the deploy log (the CLI prints a log URL; the dashboard has the full build log), then address the actual cause — the build command or publish directory in `netlify.toml`, a missing dependency, or the function that failed to bundle — and re-run the deploy.
→ Don't route around a failed build to force the site live: no `netlify api` publish/restore, no direct `https://api.netlify.com/...` calls, no reading auth tokens off disk, and don't ship a previous deploy in place of the failing one. If the log doesn't resolve it, report the exact error + log URL + affected site to the user and stop.
→ Even if the user *asks* how to "roll back" or restore a previous deploy, correct the premise rather than complying: because the failed deploy never published, the previous deploy is still live and there is nothing to restore. Do **not** hand over `netlify api restoreSiteDeploy` / `publishDeploy` (or a dashboard rollback) as the answer — the fix is to resolve the build failure and redeploy.

**"Secrets scanning found secrets" / deploy fails after a successful build**
→ Netlify scans the build output and source for secret values (env-var values, known key formats) *after* the build succeeds and **fails the deploy** if it finds one — so an otherwise-green build can still fail here. Read the log: it names the offending key and where it appeared.
→ If it's a real secret (an API/DB key that ended up in bundled or published output), that's a genuine leak — stop writing it into client/published files, and rotate the key if it was committed. Silencing the scanner over a real leak just ships the secret.
→ If the flagged value is legitimately non-secret (e.g. a value that must ship to the browser), scope the exception narrowly with build environment variables: `SECRETS_SCAN_OMIT_KEYS` to exclude specific env-var keys, or `SECRETS_SCAN_OMIT_PATHS` to exclude specific paths. Prefer these over `SECRETS_SCAN_ENABLED=false`, which disables scanning across the entire build.

**"Publish directory not found"**
→ Run the build yourself (`netlify build`, which mimics the Netlify build environment, or the project's own build command) and look at which directory it actually emits — don't guess the output dir from the framework name, and don't just `ls` for a folder that isn't there.
→ If the build itself **fails**, that's the real problem — surface the build error to the user and stop; don't change the `publish` path to paper over a broken build.
→ Once the build succeeds, set the `publish` path (in `netlify.toml`, or `--dir`) to match that real output directory — remembering it's resolved relative to any configured `base` directory (see above).

## Logs

The simplest command is the right default: bare `netlify logs` shows recent logs from both the `functions` and `edge-functions` sources, covering roughly the last 10 minutes. Add flags only to scope or extend it:

```bash
netlify logs                                       # recent functions + edge-functions logs (~last 10m)
netlify logs --follow                              # stream live
netlify logs --source functions --function my-fn   # one function's logs
netlify logs --source deploy --source functions    # include deploy logs (sources combine)
netlify logs --since 24h                           # longer historical window
```

`--source` accepts `functions`, `edge-functions`, and `deploy`. This is the documented CLI logs surface — reach for it before the dashboard, and see [CLI commands](references/cli-commands.md) for more.

## Useful Commands

| Command | Description |
|---|---|
| `netlify build` | Run the build locally (mimics the Netlify build environment) |
| `netlify deploy` | Draft deploy (preview URL) |
| `netlify deploy --prod` | Production deploy |
| `netlify deploy --dir=<dir>` | Deploy a specific directory |
| `netlify clone org/repo` | Clone, link, and set up in one step |
| `netlify open` | Open the site in the Netlify dashboard |
| `netlify logs` | Recent function + edge-function logs (see Logs above) |

## Related skills

- **netlify-config** — `netlify.toml` (build settings, redirects, headers, deploy contexts) and environment-variable management (`env:set`, `env:get`, `env:list`, context scoping).
- **netlify-frameworks** — framework adapter/plugin setup and local development (`netlify dev`, the Netlify Vite plugin).
- **netlify-access-control** — restricting who can reach a site or its deploys.

## References

- [CLI commands](references/cli-commands.md)
- [Deployment patterns](references/deployment-patterns.md)
- [netlify.toml guide](references/netlify-toml.md)
