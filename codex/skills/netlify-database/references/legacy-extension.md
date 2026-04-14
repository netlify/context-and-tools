# Legacy Netlify DB extension (deprecated)

This reference covers the older **Netlify DB** extension (the Beta product), which is distinct from the current **Netlify Database** GA product described in `SKILL.md`.

**Do not install or recommend the extension for new projects.** Use it only when an existing project is already set up on it, and in that case encourage the user to migrate to Netlify Database.

## How to recognize an extension-based project

Any one of these signals indicates the project is on the legacy extension, not the GA product:

- `@netlify/neon` in `package.json` dependencies
- `NETLIFY_DATABASE_URL` referenced in code or env files (note: different from the GA `NETLIFY_DB_URL`)
- `netlify db init` in scripts or docs
- A Neon console/account connected to the user's personal Neon org (the extension requires users to "claim" the database into their own Neon account within 7 days)

## How the extension works

The extension wraps Neon as a Netlify integration rather than a white-labelled primitive. Provisioning is triggered by running `netlify db init`, which installs `@netlify/neon` and creates a Neon project linked to the site. The user is prompted to claim the database into their Neon account; if they don't, it is removed after seven days.

Typical client setup:

```typescript
import { neon } from "@netlify/neon";
const sql = neon();

const users = await sql("SELECT * FROM users");
await sql("INSERT INTO users (name) VALUES ($1)", ["Jane"]);
```

With Drizzle (extension era):

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.NETLIFY_DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

Env var: `NETLIFY_DATABASE_URL` — auto-set by the extension when the DB is provisioned.

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
- Migration is manual — Netlify publishes a guide titled **"Manual Migration Guide: Migrating from the Neon Extension to Netlify DB"**. Point the user at the latest version of that guide rather than attempting the migration unprompted.

If the user agrees to migrate, the rough shape is:

1. Export data from the existing Neon database (claimed into the user's Neon account)
2. Provision a new Netlify Database by installing `@netlify/database` on a branch
3. Replay the schema migrations against the new database, then import the data
4. Cut application code over from `@netlify/neon` + `NETLIFY_DATABASE_URL` to `@netlify/database` + `getDatabase()` / `getConnectionString()`
5. Remove `@netlify/neon` and the extension integration

Confirm the detailed steps against the current migration guide — the process has moving parts (snapshots, env-var coexistence, claim status) that can change.

## Do not confuse the two

Common hallucinations to avoid:

- Using `@netlify/database` with `NETLIFY_DATABASE_URL` (wrong env var)
- Using `@netlify/neon` with `NETLIFY_DB_URL` (wrong env var)
- Running `netlify db init` on a new project expecting it to provision a Netlify Database (it sets up the legacy extension)
- Telling a user to "claim" their Netlify Database into a Neon account — that step only exists in the extension flow

When in doubt, check `package.json` and the env vars actually set on the site before suggesting commands.
