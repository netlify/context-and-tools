---
name: netlify-database
description: Use this skill whenever a Netlify project needs a Postgres database. It covers Netlify Database setup, queries from Functions or Edge Functions, schema changes through migrations in netlify/database/migrations, Drizzle ORM wiring, local dev databases and tests, deploy-preview database branches, and moving off Neon, Supabase, RDS or the legacy @netlify/neon extension. Activate it when someone asks to add a database, store users or posts or orders, save form submissions, create or alter a table, add a column, write a migration, set up Drizzle, fix a failing migration deploy, seed or test against a local database, or switch an existing Postgres app onto Netlify. Use it even if the request never says Netlify Database explicitly.
---

# Netlify Database

Managed Postgres built into Netlify. Netlify provisions the database, applies migrations on deploy, and creates a database branch for every deploy preview and agent run.

## Use this, not that

```ts
// ✅ Modern: auto-configured, branch-aware
import { getDatabase } from "@netlify/database";
const db = getDatabase();
const users = await db.sql`SELECT * FROM users WHERE id = ${id}`;

// ✅ Drizzle: native adapter, connection configured automatically
import { drizzle } from "drizzle-orm/netlify-db";
export const db = drizzle({ schema });
```

```ts
// ❌ Legacy Neon extension: do not write new code with it
import { neon } from "@netlify/neon";   // reads NETLIFY_DATABASE_URL
```

Netlify Database reads `NETLIFY_DB_URL`. It does **not** read `NETLIFY_DATABASE_URL`.

## Install

```bash
npm install @netlify/database                              # required: its presence triggers provisioning
npm install drizzle-orm@beta && npm install -D drizzle-kit@beta   # Drizzle: @beta is mandatory
npm install -g netlify-cli                                  # CLI 26.0.0+, Node 20.12.2+
```

Or run `netlify database init --yes`. It is non-interactive: it installs packages, scaffolds a starter migration, and verifies connectivity.

> ⚠️ **No `@netlify/database` installed means no database.** Automatic provisioning only happens when the package is in the project. Without it, nothing is provisioned on deploy.

> ⚠️ **Costs credits.** Netlify Database is available on Credit-based plans only. An active database consumes credits for compute and bandwidth. Storage is currently free. Every active deploy preview uses one branch toward the plan's branch limit.

## File layout

```text
netlify/database/migrations/          # auto-applied on deploy; do not move
├── 20260301143000_create_users.sql            # SQL-file format
└── 20260318091500_add_posts/migration.sql     # subdirectory format
netlify/functions/*.ts                # query from here or from edge functions
drizzle.config.ts                     # if using Drizzle
db/schema.ts, db/index.ts             # Drizzle schema and client
```

Migration name format is `<number>_<slug>`:
- The slug may contain only `[a-z0-9_-]`.
- Migrations are sorted **lexicographically**. Use timestamp prefixes.
- A migration's name is its filename minus the extension.

## Function example

```ts
// netlify/functions/users.ts
import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req: Request) => {
  if (req.method === "GET") {
    return Response.json(await db.sql`SELECT * FROM users ORDER BY id DESC`);
  }
  if (req.method === "POST") {
    const { name, email } = await req.json();
    const [user] = await db.sql`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING *`;
    return Response.json(user, { status: 201 });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/users" };
```

```sql
-- netlify/database/migrations/20260301143000_create_users.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Drizzle

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",   // REQUIRED: the default "drizzle" dir is never applied
});
```

```ts
// db/schema.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  createdAt: timestamp().defaultNow(),
});

// db/index.ts
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";
export const db = drizzle({ schema });
```

After changing the schema:
1. Run `npx drizzle-kit generate`.
2. Commit the generated files under `netlify/database/migrations/`.
3. Deploy.

## API: `@netlify/database`

| Call | Returns |
|---|---|
| `getDatabase(options?)` | Client with `sql` and `pool`. Options: `connectionString`, `debug`. Picks the right connector per runtime. |
| `getConnectionString()` | Postgres URL for the current branch (production or preview), for your own driver. |
| `process.env.NETLIFY_DB_URL` | Same URL, available in builds, functions, edge functions, and agent runners. |

### `db.sql`

`db.sql` is a tagged template (Waddler). Every `${}` value is a bound parameter. The result is awaitable and resolves to `T[]`.

```ts
const rows = await db.sql<User>`SELECT * FROM users`;
for await (const row of db.sql`SELECT * FROM users`.stream()) {}
for await (const chunk of db.sql`SELECT * FROM users`.chunked(100)) {}
db.sql`...`.toSQL();                                    // SQL + params, not executed

db.sql.identifier({ table: "users" });                  // dynamic table/column names
const data = db.sql.values([["Ada", "a@x.com"], ["Bob", "b@x.com"]]);
await db.sql`INSERT INTO users (name, email) VALUES ${data}`;
db.sql.default;                                         // SQL DEFAULT keyword
db.sql.raw("DESC");                                     // ⚠️ unparameterized
await db.sql.unsafe("SELECT * FROM users WHERE id = $1", [42], { rowMode: "object" }); // ⚠️ raw string
```

> ⚠️ `sql.raw` and `sql.unsafe` bypass injection protection. Never pass user input to them.

### Transactions require `db.pool`

`db.pool` is a `pg.Pool`. `BEGIN`, `COMMIT`, and `ROLLBACK` must all run on the same client, so a transaction cannot be done with `db.sql`.

```ts
const client = await db.pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO users (name, email) VALUES ($1, $2)", ["Ada", "ada@example.com"]);
  await client.query("INSERT INTO posts (author_id, title) VALUES ($1, $2)", [1, "First post"]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

### Other drivers

```ts
import pg from "pg";
const pool = new pg.Pool({ connectionString: getConnectionString() });

import postgres from "postgres";
const sql = postgres(process.env.NETLIFY_DB_URL);
```

> ⚠️ **Lambda compatibility mode functions get no auto-configured connection.** The same applies outside Netlify and to an outdated CLI. In those cases you must call `getDatabase({ connectionString })`. The symptom is the error `The environment has not been configured to use Netlify Database`. Connection strings contain credentials: keep them in env vars or a secret manager, never in commits.

## Migrations: how they ship

- **Deploy preview:** migrations apply on each new deploy, before the deploy becomes available. A failed migration fails the deploy.
- **Production:** migrations apply immediately before publish, and a failure **blocks publishing**. With auto-publish off, migrations apply when you manually publish.
- **Local:** migrations are never automatic. Run `netlify database migrations apply`.
- **Data changes** (backfills, fixes, seeds for production) also ship as migration files containing DML.

> ⚠️ **Never edit, rename, or delete an applied migration.** Checksums are tracked, and the next deploy fails with `has been modified after being applied` or `has been removed after being applied`. To fix:
> - Restore the original file with `git checkout` or `netlify database migrations pull`.
> - Write a new corrective migration instead.

> ⚠️ **Out-of-order prefixes fail.** A new migration must sort after every applied one. Generate names with `netlify database migrations new -d "<purpose>"`, which creates `<prefix>_<slug>/migration.sql`.

> ⚠️ **Renames and drops break live traffic.** Old code briefly runs against the new schema during a deploy. Use expand → migrate → contract:
> 1. Add the new column and write to both columns.
> 2. Backfill the new column.
> 3. Drop the old column in a later migration.
>
> New tables and new nullable columns are safe in one migration.

**Own migration tool?**
- Keep its files **outside** `netlify/database/migrations`.
- You must apply migrations to preview branches yourself, for example in the build command.
- There is no publish hook. Production schema changes must be backwards-compatible and applied out of band before publishing.

## Branches and previews

- Only production deploys reach the production database.
- Each deploy preview, and each agent run, gets its own branch. A preview branch is forked from production data, so **it may contain real user data and PII**.
- The production branch cannot be reset.
- Production rollback means reverting the deploy. Restoring a snapshot overwrites data and is not a routine rollback.
- Locally there are no branches: there is one local database.

## Local dev and tests

```bash
netlify dev                      # starts a local Postgres with the dev server
netlify database migrations apply [--to <name>]
netlify database status [--json]
netlify database connect --query "SELECT * FROM users LIMIT 10" --json
netlify database reset           # wipes the LOCAL db only
netlify database migrations reset   # deletes local migration files not yet applied
psql "$(netlify database connect --json | jq -r .connection_string)"
```

For Vite, add `netlify()` from `@netlify/vite-plugin` to `plugins`. It runs the same engine as `netlify dev` and shares the same data.

```ts
// Vitest: DB only
import { NetlifyDB } from "@netlify/database-dev";
const db = new NetlifyDB();                  // in-memory, random port
const url = await db.start();
await db.applyMigrations("./netlify/database/migrations");
await db.stop();

// Full environment: sets NETLIFY_DB_URL
import { NetlifyDev } from "@netlify/dev";
const nd = new NetlifyDev({ projectRoot: "./fixtures/my-project" });
await nd.start(); /* tests */ await nd.stop();
```

Local limitations:
- The local database is a single process, so don't use it for load testing.
- Auto-scale and sleep settings don't apply locally.

## CLI quick reference

`netlify database`:

| Command | Purpose |
|---|---|
| `init [-y]` | Set up the database in a project |
| `status [-b <branch>] [--show-credentials] [--json]` | Enabled state, package presence, connection string, applied/pending migrations |
| `migrations new -d <desc> [-s sequential\|timestamp]` | Create a correctly named migration |
| `migrations apply [--to <name>]` | Apply pending migrations to the local database |
| `migrations pull [-b [branch]] [--force]` | ⚠️ Overwrites local migration files with a remote branch's |
| `migrations reset [-b <branch>]` | Delete unapplied local migration files |
| `connect [-q <sql>] [--json]` | Query the local database |
| `reset` | Wipe the local database |

Full flag details are in `references/cli-commands.md`.

## Common errors

| Error | Fix |
|---|---|
| `database not found` | Install `@netlify/database` and deploy, or run `netlify database init`. |
| `added out of order` | Rename with a higher prefix. If it was never applied anywhere, `migrations reset`. |
| `error running migrations: …` | Read the DB error in the deploy log. Reproduce locally with `migrations apply`, and fix on a preview before merging. |
| `branch limit reached` | Too many active previews. Close stale PRs or upgrade the plan. |
| `database feature not available for this account` | The account needs a Credit-based plan. |
| `compute customization requires a Pro or higher plan` | Free/Personal plans use default compute. |
| `Access Denied` | Permission issue: only Team Owners delete databases, and only Owners and Developers view connection strings. |

## Deeper guides

- Footgun catalog: `references/operational-footguns.md`
- Migration patterns: `references/migrations.md`
- Local setup and testing: `references/local-dev.md`
- Moving from the Neon extension: `references/migration-from-extension.md`
- Reading old `@netlify/neon` code: `references/legacy-extension.md`
- Product docs: https://docs.netlify.com/build/data-and-storage/netlify-database/

<!-- Gaps: numeric branch/database plan limits, the permissions table, and auto-scale/sleep settings are not in the source.
Preview-branch naming and lifetime (re-fork vs reuse on later pushes) is unclear. REST endpoints for branch reset/list are undocumented. -->

<!-- system: agent-context/database/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (database)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. Production data changes are expressed as DML migrations — agents never
   edit rows directly (UI row editing exists for humans; it is not an agent
   surface).
2. Preview branches can contain production data, including PII — and preview
   deploy links are public. Warn before sharing.
3. Use only documented surfaces: no raw psql against internal endpoints, no
   `netlify api` scraping, no reading tokens from local CLI config files.
4. Deep guides live in this skill: `references/operational-footguns.md`,
   `references/migrations.md`, `references/local-dev.md`,
   `references/cli-commands.md`, `references/migration-from-extension.md`,
   `references/legacy-extension.md`.
5. Schema changes reach hosted databases only as committed migration files
   applied by the deploy. Never run `drizzle-kit push` in any form against a
   Netlify-hosted database, never run `drizzle-kit migrate` against
   `NETLIFY_DB_URL`, and never apply DDL via `netlify database connect` or
   any direct connection.
6. When a `netlify` command or a deploy fails, surface the exact error, the
   deploy log URL, and the affected site/branch to the user and stop — do
   not invent recovery commands or escalate to lower-level tools.
7. First-deploy `401 Access Denied` on `createSiteDatabase`: if it happened
   on a `--prod`-first deploy, retry preview-first (`netlify deploy`, no
   `--prod`); if a preview also fails, report and stop. Never curl
   `api.netlify.com`, run `netlify api createSiteDatabase`, or pull tokens
   from local CLI config to work around it.
8. A request to change existing data is ambiguous between production and the
   preview branch — if the prompt didn't say, ask. When acting on someone's
   behalf, default to not touching production.
9. Destructive database operations — REST branch delete, snapshot restore,
   any reset — require explicit user confirmation first. The body must not
   present snapshot restore as a routine production-rollback lever.
10. Pin: `drizzle-orm` and `drizzle-kit` must be installed from `@beta` —
    `latest` lacks the `drizzle-orm/netlify-db` adapter and will fail. The
    body may not soften this to a recommendation.
