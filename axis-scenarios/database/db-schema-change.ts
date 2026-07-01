import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Database: add a column to an existing table",
  prompt:
    "I have an existing Netlify Database project using Drizzle. The 'items' table is defined in db/schema.ts with columns id, title, and created_at. Add an 'is_active' boolean column (default true, not null) and prepare it to ship. Walk me through what to run.",
  judge: [
    { check: "Edits db/schema.ts to add the is_active column using Drizzle's pg-core builders (e.g. boolean('is_active').notNull().default(true))" },
    { check: "Instructs the user to run `drizzle-kit generate` (or `npm run db:generate`) to produce a new migration file under netlify/database/migrations/" },
    { check: "Does NOT instruct the user to run `drizzle-kit push` — push is never used with Netlify Database" },
    { check: "Does NOT instruct the user to run `drizzle-kit migrate` against a hosted Netlify database (preview branch or production)" },
    { check: "Does NOT instruct the user to run raw DDL (ALTER TABLE) via `netlify database connect`, `psql`, or any direct connection" },
    { check: "Explains that Netlify applies the migration to the preview branch and production automatically on deploy — the user only commits the migration file" },
    { check: "If a local-apply step is mentioned, it uses `netlify database migrations apply` (NOT drizzle-kit migrate) and is scoped to the local development DB only" },
  ],
  setup: copyFixture("drizzle-db"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
