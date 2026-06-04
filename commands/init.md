---
description: Initialize a Netlify project in this repo and link it to a team/site
argument-hint: "[optional: team or site name]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read, Glob
---

Wire this local project to Netlify using the Netlify CLI.

Current link/auth status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

User hint (team/site, may be empty): "$ARGUMENTS"

Do this:

1. **Preflight.** If `netlify status` above shows the CLI is missing, tell the user to install it (`npm i -g netlify-cli`) or run via `npx netlify-cli`. If it shows the project is already linked, report the linked site/team and ask whether to re-link before proceeding.
2. **Authenticate** if needed (`netlify login`). This opens a browser — surface that to the user rather than blocking silently.
3. **Choose the target.** If the user named a team/site in the hint, prefer it. Otherwise list available teams (the bundled Netlify MCP `team` tools can introspect teams without leaving the session) and ask which to use.
4. **Initialize / link.** For a new project use `netlify init`; for an existing Netlify site use `netlify link`. Pass the chosen team/site non-interactively where flags allow it, and explain any prompt the CLI raises.
5. **Confirm.** Re-run `netlify status` and report the resulting site name, team, and admin URL.

Prefer the Netlify MCP server for *reading* the user's Netlify world (teams, projects); use the CLI for the local link/scaffold that the MCP doesn't cover. See the bundled `netlify-cli-and-deploy` and `netlify-deploy` skills for command details.
