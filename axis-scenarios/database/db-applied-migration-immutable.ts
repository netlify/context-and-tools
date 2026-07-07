import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Once a migration has been applied to any database it is immutable -- editing
// it won't re-run and drifts the migration history from the actual schema. Fix
// it by rolling forward with a new migration. Grounded in netlify-database/
// SKILL.md ("Once a migration has been applied to any database, never modify it
// -- roll forward with a new migration instead") and references/migrations.md
// ("Already applied to any database ... treat as immutable. Roll forward with a
// new migration").
export default {
  name: "Database: applied migration is immutable -- roll forward, never edit",
  prompt:
    "Our Netlify Database (Drizzle) project has a migration at netlify/database/migrations/0001_create_users.sql that already shipped to production last week. I just noticed it made the `email` column nullable, but it should be NOT NULL. Can I just edit that migration file to add NOT NULL and redeploy? Walk me through the right way to fix this.",
  judge: [
    {
      check:
        "Says NOT to edit the already-applied `0001_create_users` migration -- once a migration has been applied to any database it is immutable; editing the file won't re-run against databases that already applied it and it drifts the migration history from the actual schema.",
    },
    {
      check:
        "Directs the user to roll forward with a NEW migration that alters `email` to NOT NULL, committed on top of the existing migration.",
    },
    {
      check:
        "For the Drizzle path: update db/schema.ts to mark the column notNull, then run `drizzle-kit generate` (or `npm run db:generate`) to produce the new migration -- does NOT hand-edit the old migration file, and does NOT run `drizzle-kit push`.",
    },
    {
      check:
        "Does NOT run raw `ALTER TABLE` against a hosted Netlify database via `netlify database connect`, `psql`, or any direct connection -- the deploy applies the new migration to the preview branch and then production.",
    },
    {
      check:
        "If a local-apply step is mentioned, it uses `netlify database migrations apply` scoped to the local development DB only (passes vacuously if not mentioned).",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
