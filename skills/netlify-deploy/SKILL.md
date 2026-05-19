---
name: netlify-deploy
description: "Deploy web projects to Netlify using the Netlify CLI (`npx netlify`). Use when the user asks to deploy, host, publish, or link a site/repo on Netlify, create preview or production deploys, check deploy status, configure build settings, or troubleshoot a failed deployment."
---

# Netlify Deploy

## Workflow

### 1. Authenticate

```bash
npx netlify status
```

If not authenticated:

```bash
npx netlify login
# Alternative: export NETLIFY_AUTH_TOKEN=<token>
```

### 2. Link Site

Check `netlify status` output — if already linked, skip to step 3.

```bash
# Link by Git remote
npx netlify link --git-remote-url <REMOTE_URL>

# Or create new site
npx netlify init
```

### 3. Deploy

**Preview deploy** (default — creates a unique URL for testing):

```bash
npx netlify deploy
```

**Production deploy**:

```bash
npx netlify deploy --prod
```

**Deploy with message and specific directory**:

```bash
npx netlify deploy --prod --dir=dist --message="Fix login bug"
```

### 4. Verify

After deploying, confirm the deploy succeeded:

```bash
# Check the deploy URL returned by the CLI
curl -sI <DEPLOY_URL> | head -5

# Or open in browser
npx netlify open:site
```

If the deploy URL returns a non-200 status, check build logs via `npx netlify open:admin` → Deploys.

## Build Configuration

If `netlify.toml` exists, the CLI uses it automatically. If not, it prompts for build command and publish directory. Detect the framework from `package.json` and suggest appropriate settings. See [netlify.toml guide](references/netlify-toml.md) for full configuration reference.

## Error Recovery

| Error | Fix |
|---|---|
| "Not logged in" | `npx netlify login` |
| "No site linked" | `npx netlify link` or `npx netlify init` |
| "Build failed" | Run `npm run build` locally to reproduce, check logs |
| "Publish directory not found" | Verify build output path matches `publish` in netlify.toml |

See [deployment patterns](references/deployment-patterns.md) for detailed scenarios (first-time deploy, monorepo, custom domains).

## References

- [CLI commands](references/cli-commands.md) — full command reference with flags
- [Deployment patterns](references/deployment-patterns.md) — common scenarios and decision tree
- [netlify.toml guide](references/netlify-toml.md) — build settings, redirects, headers, contexts
