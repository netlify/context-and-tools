# Legacy Netlify DB extension (deprecated)

This reference covers the older **Netlify DB** extension (the Beta product), which is distinct from the current **Netlify Database** GA product described in `SKILL.md`.

**Do not install or recommend the extension for new projects.** Use it only when an existing project is already set up on it, and in that case encourage the user to switch to Netlify Database.

## How to recognize an extension-based project

Any one of these signals indicates the project is on the legacy extension, not the GA product:

- `@netlify/neon` in `package.json` dependencies
- `NETLIFY_DATABASE_URL` referenced in code or env files (note: different from the GA `NETLIFY_DB_URL`)
- `netlify db init` in scripts or docs

## Keeping an extension project working

If you land in a project that uses the extension:

- **Don't rip it out** unless the user has explicitly asked to migrate. The extension database holds their data and their Neon account holds the claim.
- **Don't mix packages.** Don't install `@netlify/database` alongside `@netlify/neon` without a migration plan — you'll end up with two databases and two env vars.
- Keep using `@netlify/neon` and `NETLIFY_DATABASE_URL` for reads and writes in that codebase.
- Migrations still belong in a migrations directory (commonly `netlify/db/migrations/` or `./migrations/`) and are typically applied via `drizzle-kit migrate`.

## Encourage migration

The extension is deprecated. New database creation through the extension is blocked, and the Netlify UI surfaces deprecation notices when a project is using it. When you're helping a user on an extension-based project, proactively tell them:

- Netlify Database (GA) is the supported product going forward
- It removes the claim step, the separate Neon account, and the `@netlify/neon` / `NETLIFY_DATABASE_URL` indirection
- Switching is manual but well-documented. See `references/migration-from-extension.md` for the full step-by-step process (covers switching from any external Postgres provider, with extension-specific callouts).

If the user agrees to switch, walk through the steps in that reference. Do not attempt the switch unprompted — confirm with the user first, as the process involves a brief downtime window and an operator step to import data.

## Do not confuse the two

Common hallucinations to avoid:

- Using `@netlify/database` with `NETLIFY_DATABASE_URL` (wrong env var)
- Using `@netlify/neon` with `NETLIFY_DB_URL` (wrong env var)
- Running `netlify db init` on a new project expecting it to provision a Netlify Database (it sets up the legacy extension)
- Telling a user to "claim" their Netlify Database into a Neon account — that step only exists in the extension flow

When in doubt, check `package.json` and the env vars actually set on the site before suggesting commands.
