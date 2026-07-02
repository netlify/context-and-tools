import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: hand-written SQL migration for pgvector",
  prompt:
    "Our Netlify Database project uses Drizzle. I need to enable the `pgvector` extension (`CREATE EXTENSION vector`) — something Drizzle Kit won't generate for me. Set this up as a migration the right way and tell me the exact commands and file shape.",
  judge: [
    { check: "Scaffolds the migration file with `netlify database migrations new -d \"...\"` (rather than only telling the user to drop a file somewhere by hand)" },
    { check: "Places the migration under `netlify/database/migrations/` following the supported file shape: `<prefix>_<slug>/migration.sql` (subdirectory) or `<prefix>_<slug>.sql` (flat), where `<prefix>` is digits (timestamp or sequential) and `<slug>` is lowercase letters/numbers/hyphens/underscores" },
    { check: "Recommends keeping the SQL idempotent — e.g. `CREATE EXTENSION IF NOT EXISTS vector`" },
    { check: "Does NOT run the `CREATE EXTENSION` statement directly against a hosted database via `netlify database connect`, `psql`, or any direct connection — the deploy applies the migration" },
    { check: "Does NOT run `drizzle-kit migrate` or `drizzle-kit push` against a hosted Netlify database; a local test, if mentioned, uses `netlify database migrations apply` against the local dev DB only" },
    { check: "Mentions running the Drizzle generate step afterward so Drizzle Kit's snapshot stays in sync with the manual migration (passes vacuously if the agent does not need it for an extension-only change)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
