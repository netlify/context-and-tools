# Local development

`netlify dev` runs Netlify Database locally against an embedded Postgres (PGLite) instance — no remote connection, and no risk of writing to production data. Data persists under `.netlify/db/` in the project directory.

Add `.netlify` to `.gitignore` if it isn't already.

## Running the app

```bash
netlify dev
```

The database is available to functions, edge functions, framework server routes, and any code that calls `getDatabase()` or `getConnectionString()` — same API as production.

For Vite-based projects, install `@netlify/vite-plugin` so the dev server can connect to the local database without launching `netlify dev` as a wrapper.

## Running Drizzle Kit commands against the local DB

`netlify dev:exec` runs a command with the same environment `netlify dev` uses, so Drizzle Kit connects to the local PGLite instance rather than any hosted database:

```bash
netlify dev:exec drizzle-kit generate   # generate a migration from db/schema.ts
netlify dev:exec drizzle-kit migrate    # apply pending migrations locally
```

`drizzle-kit migrate` here targets PGLite only. Do **not** run `drizzle-kit migrate` or `drizzle-kit push` against `NETLIFY_DB_URL` in any other context — Netlify applies migrations to hosted databases (preview branches and production) automatically on deploy. See `references/migrations.md`.

We don't use `drizzle-kit push`. Always go through `generate` so a migration file lands in `netlify/database/migrations/` and gets applied on deploy.

## Resetting local data

Delete `.netlify/db/` to wipe the local database and start fresh. Re-run `netlify dev` (or the migrate command) and the schema will be re-applied from the migration history.

## Common issues

- **"Environment has not been configured"**: install `@netlify/vite-plugin` or run the app via `netlify dev`.
- **Schema drift between local and preview**: confirm every schema change has a matching migration file in `netlify/database/migrations/` committed to the branch. If you see schema on the local DB that isn't represented by a migration, regenerate with `npm run db:generate`.
- **Data not persisting across restarts**: confirm `.netlify/db/` exists and is writable. A stale lockfile in that directory can also cause startup failures — remove it if `netlify dev` won't boot.
