---
name: netlify-database
description: Guide for using Netlify Database — the GA managed Postgres product built into Netlify. Use when a project needs any kind of dynamic, structured, or relational data. Covers provisioning via @netlify/database, Drizzle ORM (@beta) setup, migrations, preview branching, and safe production data handling. Blobs is only for file/asset storage — any dynamic data belongs in the database.
---

# Netlify Database

**Netlify Database** is the managed Postgres product built into the Netlify platform. It is **GA** and is the default choice for any dynamic data in a Netlify project.

Install `@netlify/database` and Netlify auto-provisions a Postgres database for the site at deploy time. Each deploy preview gets its own isolated branch forked from production data. No Neon account, connection-string wiring, or claim flow — the database is a first-class Netlify primitive.

## Database vs Blobs

Use **Netlify Database** for anything dynamic:

- Any user-generated or app-generated records (posts, comments, orders, sessions, audit logs)
- Structured data that will grow, be queried, or be joined
- Key-value-style data read or written by application code at runtime

Use **Netlify Blobs** only for **file and asset storage**: images, documents, exports, uploads, cached binary artifacts. Do not use Blobs as a dynamic data store — reach for Database instead. See `netlify-blobs/SKILL.md`.

## CRITICAL: Install Drizzle from the `@beta` dist-tag

The Netlify Database adapter for Drizzle ORM currently only exists on the `beta` release line of `drizzle-orm`. Install **both** `drizzle-orm` and `drizzle-kit` from the `@beta` dist-tag:

```bash
npm install drizzle-orm@beta
npm install -D drizzle-kit@beta
```

The default `latest` versions do not include the `drizzle-orm/netlify-db` adapter and will fail. If `drizzle-kit generate` errors about being outdated, or the `drizzle-orm/netlify-db` import fails to resolve, the install is missing `@beta`.

The `@beta` tag only affects the installed version — imports are written as `drizzle-orm`, `drizzle-orm/pg-core`, and `drizzle-orm/netlify-db` without modification.

## CRITICAL: Never apply migrations to a Netlify-hosted database

The only database you ever apply migrations to yourself is the **local PGLite instance** that `netlify dev` runs. For any Netlify-hosted database — production or a deploy preview branch — **Netlify applies migrations automatically during the deploy**. Your job is to create migration files and commit them. The deploy does the rest.

This means:

- Do NOT run `drizzle-kit migrate` against `NETLIFY_DB_URL` from any context other than `netlify dev:exec` (which targets PGLite).
- Do NOT run `drizzle-kit push` at all. Generate a migration and let the deploy apply it.
- Do NOT run raw DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`) via `netlify db connect`, `psql`, or any other direct connection. The connection is read-only for a reason.
- Do NOT export `NETLIFY_DB_URL` from a preview or production context and run a client against it. Migrations drift the moment anything touches the schema out-of-band.

The one documented exception is a **one-time data import** during a provider switch — see `references/migration-from-extension.md`. Outside that specific flow, the rule is absolute: schema changes go through migration files, migration files get applied by the deploy.

## Not the legacy "Netlify DB" extension

The older **Netlify DB** extension (Beta) is **deprecated**. It is a separate product and must not be confused with Netlify Database. Do not recommend or install it for new projects.

| | Netlify Database (GA, recommended) | Netlify DB extension (deprecated Beta) |
|---|---|---|
| Package | `@netlify/database` | `@netlify/neon` |
| Env var | `NETLIFY_DB_URL` | `NETLIFY_DATABASE_URL` |
| Setup | Install package → auto-provisioned at deploy | `netlify db init` → claim into user's Neon account within 7 days |
| Status | GA | Deprecated; new creation blocked as of April 2026 |

If an existing project is already using the `@netlify/neon` extension, keep it working and encourage the user to switch. See `references/legacy-extension.md` for recognition and coexistence, and `references/migration-from-extension.md` for the full switching process (also covers switching from other external Postgres providers).

## Provisioning

Install the package and Netlify does the rest at deploy time:

```bash
npm install @netlify/database
```

No CLI command is required — presence of `@netlify/database` in the dependency tree triggers provisioning on the next deploy. A database can also be created manually from the Netlify UI before first deploy.

## Drizzle ORM (recommended path)

Drizzle is the recommended way to work with Netlify Database. Prefer Drizzle over writing raw SQL or hand-editing migration files — manual migrations are an edge case (see `references/migrations.md`).

### Install

```bash
npm install @netlify/database drizzle-orm@beta
npm install -D drizzle-kit@beta
```

### Schema file

Create `db/schema.ts`. Define all tables here using Drizzle's schema builder.

```typescript
// db/schema.ts
import { integer, pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

Use snake_case strings for column names (`"is_active"`, `"created_at"`) to match Postgres conventions. Drizzle variable names can be camelCase.

### Drizzle client

Create `db/index.ts`. The adapter on `drizzle-orm/netlify-db` picks the right driver for the runtime automatically.

```typescript
// db/index.ts
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

export const db = drizzle({ schema });
export * from "./schema.js";
```

The connection is configured automatically — no connection string needed. In TypeScript ES modules, keep the `.js` extension on relative imports.

### Drizzle Kit config

Create `drizzle.config.ts` at the project root. The `out` property **must** be `netlify/database/migrations` — that's the directory the deploy applies migrations from.

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",
  migrations: { prefix: "timestamp" },
});
```

**Always set `migrations: { prefix: "timestamp" }`.** Drizzle Kit's default uses sequential numeric indices (`0000_`, `0001_`, …) which collide when two team members generate migrations on parallel branches. Timestamp prefixes keep filenames unique and order stable across branches.

### Package scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "netlify dev:exec drizzle-kit migrate"
  }
}
```

- `db:generate` writes a new migration file under `netlify/database/migrations/` from the current schema.
- `db:migrate` applies pending migrations to the **local PGLite database only**. It is wrapped in `netlify dev:exec` specifically so it uses the local connection, not the hosted one. Hosted migrations are applied by the deploy — never by this script.

### Schema-change workflow

1. Edit `db/schema.ts`.
2. `npm run db:generate` — writes a new file into `netlify/database/migrations/`.
3. Review the SQL.
4. `npm run db:migrate` — applies it to the local PGLite DB for testing.
5. Commit the schema change and migration file together and push. The deploy applies the migration to the preview branch, then to production on publish.

### Query patterns

```typescript
import { db, items } from "./db/index.js";
import { eq, desc } from "drizzle-orm";

// Select all
const all = await db.select().from(items);

// Select with condition
const [one] = await db.select().from(items).where(eq(items.id, id)).limit(1);

// Ordering and limit
const recent = await db.select().from(items).orderBy(desc(items.createdAt)).limit(10);

// Insert
const [created] = await db.insert(items).values({ title: "New" }).returning();

// Update
const [updated] = await db.update(items).set({ title: "Updated" }).where(eq(items.id, id)).returning();

// Delete
await db.delete(items).where(eq(items.id, id));
```

Full migration workflow, expand-and-contract for breaking schema changes, and production DML migrations are in `references/migrations.md`.

## Native driver (when Drizzle isn't a fit)

When a project wants raw SQL, uses a different query builder (Kysely, etc.), or has a library that needs a `pg.Pool`, use the native driver exposed by `@netlify/database`.

```bash
npm install @netlify/database
```

```typescript
import { getDatabase, getConnectionString } from "@netlify/database";

const { sql, pool } = getDatabase();

// Tagged template — parameters are safely bound, not interpolated
const users = await sql`SELECT * FROM users WHERE active = ${true}`;

// Insert with RETURNING
const [user] = await sql`
  INSERT INTO users (name, email)
  VALUES (${name}, ${email})
  RETURNING *
`;

// Bulk insert
const rows = sql.values([
  ["Ada", "ada@example.com"],
  ["Bob", "bob@example.com"],
]);
await sql`INSERT INTO users (name, email) VALUES ${rows}`;
```

Transactions go through the pool:

```typescript
const { pool } = getDatabase();
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO users (name, email) VALUES ($1, $2)", [name, email]);
  await client.query("INSERT INTO posts (author_id, title) VALUES ($1, $2)", [id, title]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

`getConnectionString()` returns the raw URL for third-party tools that need one. Prefer the helpers above for application code.

### Manual migrations

With the native driver, write SQL migration files by hand in `netlify/database/migrations/`. The filename must be `<prefix>_<slug>.sql` where `<prefix>` is a timestamp (e.g. `20260417143022`) and `<slug>` is lowercase letters, numbers, hyphens, or underscores. Files apply in lexicographic order. See `references/migrations.md`.

Once a migration has been applied to any database, never modify it — roll forward with a new migration instead.

## Connection — don't reach for the env var

`NETLIFY_DB_URL` is set automatically across builds, functions, edge functions, and local dev. Use the `getDatabase()` / `getConnectionString()` helpers above rather than reading it directly — only reach for the raw env var for third-party tools that demand a bare string.

`NETLIFY_DB_URL` is intentionally different from the legacy extension's `NETLIFY_DATABASE_URL`. The two coexist so a project mid-migration doesn't break. Don't rename between them.

## Preview branching

Each deploy preview runs against its own database branch forked from production data. Schema and data changes in a preview do not affect production until the branch is merged and published. This means:

- Migrations run against the preview branch first — failures fail the preview, not production.
- Ad-hoc edits in a preview (via the Netlify UI data browser or a direct client) do **not** propagate to production. Always express production changes as migrations.

## Production data changes — write a DML migration

When a user asks for data changes that should land in production (seed data, backfills, one-off cleanups, CSV imports), **do not connect to the production database and run queries**. Generate a DML migration in `netlify/database/migrations/` (SQL `INSERT`/`UPDATE`/`DELETE`, or a Drizzle-generated equivalent). Tell the user you created a data migration and that merging to production will apply it. Let them verify in the preview branch first.

If the request is ambiguous ("update this record"), confirm that the user wants a production migration rather than a preview-only edit. See `references/migrations.md`.

## Netlify CLI commands for Netlify Database

The `netlify` CLI ships commands for inspecting and managing database state. If any of these aren't recognized, upgrade to the latest `netlify-cli`.

### `netlify db status`

Reports which migrations are applied, pending, missing on disk, or out of order on the preview database branch for the current project. Read this before doing migration work to understand current state.

### `netlify db connect --query "..."`

Runs a read-only SQL query against the database for inspection. Always use `--query` for one-shot execution; do not use interactive mode.

```bash
# List tables
netlify db connect --query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"

# Inspect columns
netlify db connect --query "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'items'"

# JSON output
netlify db connect --query "SELECT * FROM items LIMIT 10" --json
```

The connection is read-only. **Never run DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`) or any mutating query through `netlify db connect`.** Schema changes go through migration files.

### `netlify db migrations reset`

Deletes local migration files that have **not yet been applied** to the preview branch. Applied migrations and their data are left alone — the command can't undo something already applied.

Typical use: you generated a migration, realized it was wrong, and want to start over. Run `reset`, update `db/schema.ts`, then `npm run db:generate` produces a fresh migration.

```bash
netlify db migrations reset
```

## Iterating on migrations

When a migration you generated needs to change, what you do depends on whether it's been applied anywhere yet:

- **Already applied** to any database (local PGLite, a preview branch, or production) → treat as immutable. Roll forward with a new migration that applies the correction.
- **Only on disk** (not yet applied anywhere) → don't edit the SQL or snapshot files by hand. Run `netlify db migrations reset`, update `db/schema.ts`, then re-run `npm run db:generate`. Hand-editing desyncs Drizzle Kit's internal state and tends to produce broken migrations on the next generate.

## Local development

`netlify dev` runs the project against a local PGLite instance — no remote connection, no risk of touching production. Data persists under `.netlify/db/`. Run Drizzle Kit commands via `netlify dev:exec` so they target the local connection. See `references/local-dev.md`.

## Common mistakes

1. **Forgetting the `@beta` dist-tag.** `drizzle-orm` and `drizzle-kit` must be installed as `@beta`. The `latest` releases lack the `netlify-db` adapter.
2. **Wrong migration output directory.** Drizzle Kit defaults to `drizzle/`. Set `out: "netlify/database/migrations"` or the deploy won't apply anything.
3. **Missing `.js` extension in imports.** In TypeScript ES modules, relative imports include the `.js` extension (`from "./schema.js"`).
4. **Writing raw `CREATE TABLE` when using Drizzle.** The schema file is the source of truth. Define tables in `db/schema.ts` and generate migrations.
5. **Running `drizzle-kit migrate` or `push` against a hosted DB.** Never. The deploy applies migrations. Only `netlify dev:exec drizzle-kit migrate` (which targets PGLite) is legitimate.
6. **Using `netlify db connect` to change schema.** Read-only only. Schema changes go through migrations.
7. **Misunderstanding `netlify db migrations reset`.** It only deletes unapplied files. It cannot undo an applied migration — for that, roll forward with a new migration.
