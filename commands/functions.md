---
description: Scaffold, serve, and invoke Netlify Functions locally
argument-hint: "[create|invoke] [function-name]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read, Glob, Write, Edit
---

Scaffold and exercise Netlify Functions using the `netlify functions` CLI.

Link status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

Requested operation + args (may be empty): "$ARGUMENTS"

Do this:

1. Map the request to the right `netlify functions` subcommand (run `netlify functions --help` to confirm for the installed CLI version):
   - `create [name]` → scaffold a new function (`netlify functions:create`). Prefer the modern v2 function signature (`export default` + `Request`/`Response`, optional `config` export for path/schedule) — see the bundled `netlify-functions` skill. After scaffolding, show the generated file and explain the handler.
   - `invoke [name]` → invoke a function locally (`netlify functions:invoke`). The local dev server (`/netlify:dev`) must be running for invoke to hit live code.
   - no args → list existing functions and ask what to do.
2. When creating a function that uses other primitives (Blobs, DB, env vars), wire them using the corresponding bundled skill rather than guessing the API.
3. Report the function's local URL / route and how to invoke it. Remind the user that deploying it is a separate step (`netlify deploy` or a Git push to the linked site).
