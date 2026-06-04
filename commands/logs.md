---
description: Stream Netlify logs (functions, edge functions, or deploys) into the session
argument-hint: "[functions|edge|deploy] [function-name]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read
---

Tail Netlify logs for the linked site and surface them in context.

Link status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

What to tail (may be empty): "$ARGUMENTS"

Do this:

1. Require a linked project (see status above); if not linked, run `/netlify:init` first.
2. Map the request to the right `netlify logs` subcommand:
   - `functions` (or a function name) → `netlify logs:function [name]`
   - `edge` → `netlify logs:edge-function`
   - `deploy` / no args → `netlify logs:deploy` (build/deploy logs)
   - Run `netlify logs --help` to confirm exact subcommands for the installed CLI version.
3. Streaming log commands are long-running. Start them **in the background** and pull the captured output back into the analysis rather than blocking the session.
4. Summarize what the logs show — errors, cold starts, status codes — instead of dumping raw lines. If the user is debugging a specific failure, correlate timestamps with the most recent deploy (the bundled Netlify MCP `deploy` tools can fetch deploy metadata).
