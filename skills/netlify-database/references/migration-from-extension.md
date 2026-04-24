# Switching to Netlify Database

Step-by-step process for switching a project from an external Postgres provider to **Netlify Database** (`@netlify/database`, `NETLIFY_DB_URL`). The steps are provider-agnostic — they apply whether the source is the deprecated Netlify DB extension, a standalone Neon account, Supabase, Railway, RDS, or any other hosted Postgres.

> **Terminology.** This document uses "switch" for the provider change and "migration" exclusively for schema migration files. The two are distinct operations that happen to overlap during this process.

## Overview

1. Export data from the source database.
2. Swap application code to `@netlify/database`.
3. Push a branch — Netlify provisions a preview database and auto-applies schema migrations.
4. Import data into the preview database (rehearsal).
5. Merge to provision the production database (Netlify applies schema on the deploy), then import data (cutover).
6. Merge and clean up.

## Step 1 — Export data

Use any tool that produces replayable SQL. `pg_dump` is the standard choice:

```bash
pg_dump \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --schema=public \
  "$SOURCE_DB_URL" > tmp/prod-data.sql
```

- **`--data-only`** — schema is handled by Drizzle migrations; only export rows.
- **`--column-inserts`** — produces one `INSERT` per row with explicit column lists. Resilient to column reordering.
- **`--schema=public`** — excludes non-application schemas. See the extension-specific note below.
- Keep the dump in a gitignored directory (`tmp/`). **Do not commit production data to source control** — not even with secrets stripped. PII, data size, and operational artifacts don't belong in git.
- `pg_dump` 18+ emits `\restrict` / `\unrestrict` psql meta-commands that are not valid SQL. Strip them: `... | grep -v -E '^\\(restrict|unrestrict)' > tmp/prod-data.sql`

> **Switching from the Netlify DB extension.** If the project uses Neon Auth, the source database contains a `neon_auth` schema with auth tables (`user`, `account`, `session`, etc.). The `--schema=public` flag excludes these automatically. If you're also switching auth providers, handle that separately.

## Step 2 — Code swap

Create a feature branch and make all changes in one commit.

### Packages

Remove the old provider's packages and install `@netlify/database` plus Drizzle on the `@beta` dist-tag (required for the `drizzle-orm/netlify-db` adapter):

```bash
npm install @netlify/database drizzle-orm@beta
npm install -D drizzle-kit@beta
```

> **Switching from the Netlify DB extension.** Remove `@netlify/neon`, `@neondatabase/serverless`, and `@neondatabase/toolkit`. Keep `@neondatabase/neon-js` only if the frontend uses it for Neon Auth and auth is not being switched in this pass.

### Database client

Replace the existing Drizzle client setup. The `drizzle-orm/netlify-db` adapter picks the right driver for the runtime automatically — no manual driver branching or `getDatabase()` wiring needed:

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/netlify-db'
import * as schema from './schema.js'

export const db = drizzle({ schema })
export * from './schema.js'
```

Move the schema file to `db/schema.ts` at the project root if it isn't already there, and update application imports accordingly.

### Drizzle config

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: 'netlify/database/migrations',
  migrations: { prefix: 'timestamp' },
})
```

### Move schema migrations

Move existing migration files to the GA convention path:

```bash
git mv migrations netlify/database/migrations   # or wherever they currently live
```

### Pre-flight check: filename ordering

**Critical.** Netlify applies schema migrations **lexicographically by filename**. Drizzle Kit's `migrate` command applies by `idx` order from `_journal.json`. If the project ever changed its Drizzle prefix setting (e.g., `unix` → `timestamp`), the two orderings can diverge:

- 10-digit unix prefixes (`1771681020_...`) sort **before** 14-digit timestamp prefixes (`20260214140526_...`) alphabetically
- But the unix files may have been generated **after** the timestamp files chronologically

If the lexicographic sort of `netlify/database/migrations/*.sql` does not match the `idx` order in `_journal.json`, **rename the offending files** to timestamp prefixes using the `when` values from `_journal.json`:

```bash
date -u -r <unix_seconds> +%Y%m%d%H%M%S   # convert
git mv netlify/database/migrations/<old>_<name>.sql netlify/database/migrations/<new>_<name>.sql
git mv netlify/database/migrations/meta/<old>_snapshot.json netlify/database/migrations/meta/<new>_snapshot.json
# Update the `tag` in _journal.json to match
```

Also check the snapshot chain (`id` / `prevId` in each `meta/<tag>_snapshot.json`). Mixed prefixes can corrupt the chain — walk it in journal order and patch any broken `prevId`.

### Delete manual scripts

The GA product auto-applies schema migrations on every deploy (preview and production). Remove any scripts that ran `drizzle-kit migrate` against explicit staging/production URLs.

## Step 3 — Push and test the preview

Push the branch. On the deploy preview:

- Netlify detects `@netlify/database` in the dependency tree and **auto-provisions a branch database**.
- Schema migrations are **auto-applied** before the preview goes live.
- The preview DB is empty but the app connects and runs.

## Step 4 — Import data into preview (rehearsal)

Get the preview database's connection string:

```bash
netlify env:get NETLIFY_DB_URL --context deploy-preview
```

Or find it in the Netlify UI under **Project configuration → Database**.

Import the dump:

```bash
psql "$PREVIEW_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f tmp/prod-data.sql
```

Verify the preview URL with real data. This rehearsal validates the dump against the new schema and gives a concrete timing for the production cutover window.

## Step 5 — Production cutover

Once the production Netlify Database is provisioned (by merging the branch), Netlify has already applied the schema migrations during the production deploy. Do **not** run `drizzle-kit migrate` against the production connection string — schema is the deploy's job, and running it manually is exactly the kind of out-of-band change the rest of this skill warns against.

Re-export and import data:

```bash
# Re-export for freshness (minimize the cutover window)
pg_dump --data-only --column-inserts --no-owner --no-privileges \
  --schema=public "$SOURCE_DB_URL" | grep -v -E '^\\(restrict|unrestrict)' > tmp/prod-data-fresh.sql

# Import
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f tmp/prod-data-fresh.sql
```

There **is** a downtime window: any write to the source database between the final export and the completed import is not captured. For small databases this is seconds to minutes. For high-write systems, consider a read-only window or a catch-up pass before the final cutover.

## Step 6 — Merge and clean up

Merge the branch to main. On the production deploy, Netlify detects that schema migrations are already applied and skips them.

After verifying production:

- Remove the old provider's packages from `package.json`
- Remove references to the old connection string env var from code and environment
- Update project documentation

> **Switching from the Netlify DB extension.** Remove `@netlify/neon` and any remaining `@neondatabase/*` packages (except `@neondatabase/neon-js` if still used for auth). Remove or unset `NETLIFY_DATABASE_URL` from all deploy contexts.

## Note on direct production writes

The standard guidance in `references/migrations.md` says never to connect to the production database and run queries directly — all data changes should go through DML migrations committed to the repo. This process is the **one exception**: a one-time data seed during a provider switch, where committing production data to git is not appropriate. Once the switch is complete, resume using DML migrations for all production data changes.
