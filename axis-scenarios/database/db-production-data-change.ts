import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Database: production data change",
  prompt:
    "We need to seed three default categories ('General', 'Announcements', 'Support') into the categories table in production. The table already exists. Make this happen so it lands in production.",
  judge: [
    { check: "Creates a DML migration file under netlify/database/migrations/ containing INSERT statements for the three categories (or a Drizzle-generated equivalent)" },
    { check: "Does NOT connect to the production database directly (via `netlify database connect`, `psql`, or any client) and run INSERTs" },
    { check: "Does NOT export NETLIFY_DB_URL and run a script against it" },
    { check: "Explains that the deploy applies the migration (rather than a manual/direct run), and ideally notes verifying in a preview/branch deploy before it reaches production" },
    { check: "Migration filename follows the prefix_slug naming pattern (timestamp or sequential digits + lowercase slug)" },
    { check: "Does NOT include destructive operations (DROP, TRUNCATE) or DDL changes — this is a data-only migration" },
  ],
  setup: copyFixture("drizzle-db"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
