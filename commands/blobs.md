---
description: Read/write/list/delete entries in the linked site's Netlify Blobs store
argument-hint: "[list|get|set|delete] [store] [key] [value]"
allowed-tools: Bash(netlify:*), Bash(npx netlify:*), Read
---

CRUD on the linked site's Netlify Blobs store via the `netlify blobs` CLI.

Link status:
!`netlify status 2>&1 || echo "not-linked-or-cli-missing"`

Requested operation + args (may be empty): "$ARGUMENTS"

Do this:

1. Require a linked project (see status above); if not linked, run `/netlify:init` first.
2. Run `netlify blobs --help` to confirm the subcommand shape for the installed CLI version, then map the request:
   - `list [store]` → list keys in a store (or list stores)
   - `get [store] [key]` → read a value
   - `set [store] [key] [value]` → write a value
   - `delete [store] [key]` → remove a key
3. Execute the matched command and report the result. For `get` of large/binary values, summarize rather than dumping the full payload into the transcript.
4. Treat blob contents as potentially sensitive — do not echo secrets. For the programmatic `@netlify/blobs` API (reading/writing from functions), point the user at the bundled `netlify-blobs` skill.
