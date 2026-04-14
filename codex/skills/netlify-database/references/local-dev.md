# Local development

`netlify dev` runs Netlify Database locally against an embedded Postgres (PGLite) instance — no Neon account, no remote connection, and no risk of writing to production data. Data persists under `.netlify/db/` in the project directory.

Add `.netlify` to `.gitignore` if it isn't already.

## Running the app

```bash
netlify dev
```

The database is available to functions, edge functions, framework server routes, and any code that calls `getDatabase()` or `getConnectionString()` — same API as production.

For Vite-based projects, install `@netlify/vite-plugin` so the dev server can connect to the local database without launching `netlify dev` as a wrapper.

## Running Drizzle Kit commands

Use `netlify dev:exec` so Drizzle Kit picks up the local database connection:

```bash
netlify dev:exec drizzle-kit generate   # generate a migration from schema.ts
netlify dev:exec drizzle-kit migrate    # apply pending migrations
netlify dev:exec drizzle-kit push       # push schema directly (iteration only)
```

`drizzle-kit push` is useful while iterating on a schema locally — it skips the migration file. Before committing, switch to `generate` so the migration lands in `netlify/db/migrations/` and runs on preview and production.

## Resetting local data

Delete `.netlify/db/` to wipe the local database and start fresh. Re-run `netlify dev` (or the migrate command) and the schema will be re-applied from the migration history.

## Common issues

- **"Environment has not been configured"**: install `@netlify/vite-plugin` or run the app via `netlify dev`.
- **Schema drift between local and preview**: you've been using `drizzle-kit push` locally without generating migration files. Run `drizzle-kit generate` and commit the result so the preview branch applies the same changes.
- **Data not persisting across restarts**: confirm `.netlify/db/` exists and is writable. A stale lockfile in that directory can also cause startup failures — remove it if `netlify dev` won't boot.
