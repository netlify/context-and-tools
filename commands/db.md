---
description: Manage Netlify DB (managed Postgres) — status, create, branch
argument-hint: "[status|create|branch|...] [args]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read, Glob
---

Drive Netlify DB (managed Postgres, powered by Neon) via the `netlify database` CLI.

Link status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

Requested operation + args (may be empty): "$ARGUMENTS"

Do this:

1. Require a linked project (see link status above). If not linked, run `/netlify:init` first.
2. Map the request to the right `netlify database` subcommand:
   - no args / `status` → show whether a database is provisioned and its connection details
   - `create` → provision a database for the linked site (`netlify database create` / `netlify db init` per the installed CLI version — run `netlify database --help` to confirm subcommands before guessing)
   - `branch` → create/list database branches
3. Run `netlify database --help` first if you are unsure which subcommands the installed CLI version exposes, then execute the matched command.
4. After provisioning, report the connection string location (usually injected as an env var on the linked site) and point to the bundled `netlify-db` skill for the Drizzle ORM + migrations workflow. Do **not** print raw secrets into the transcript.

Note: the Netlify MCP server's `initialize-database` tool is currently a stub — the CLI is the real provisioning path, which is why this command wraps it.
