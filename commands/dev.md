---
description: Start the Netlify dev server locally with env vars and primitives wired
argument-hint: "[optional: extra flags, e.g. --port 8888]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read, Glob
---

Run the local Netlify dev server so functions, edge functions, redirects, and env vars behave like production.

Link status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

Extra flags from the user (may be empty): "$ARGUMENTS"

Do this:

1. If the status above shows the project is **not linked**, run `/netlify:init` first (or tell the user to) — `netlify dev` needs a linked site to inject the right environment variables.
2. Detect the framework / dev command from the repo (package.json scripts, `netlify.toml` `[dev]` block, framework config). Let `netlify dev` auto-detect unless the repo clearly needs an explicit `--command` / `--targetPort`.
3. Start the server **in the background** (it is long-running): `netlify dev $ARGUMENTS`. Capture the local URL it prints.
4. Report the local URL, which port it bound, and that functions/edge functions/env are now wired. Note that injected env vars come from the linked site — point the user at the bundled `netlify-cli-and-deploy` skill if they need to manage them.

Do not block the session waiting on the server; hand the URL back and keep it running.
