import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  skip: true,
  name: "Database: production data change",
  prompt:
    "We need to seed three default categories ('General', 'Announcements', 'Support') into the categories table in production. The table already exists. Make this happen so it lands in production.",
  judge: [
    { check: "Creates a DML migration file under netlify/database/migrations/ containing INSERT statements for the three categories (or a Drizzle-generated equivalent)" },
    { check: "Does NOT connect to the production database directly (via `netlify database connect`, `psql`, or any client) and run INSERTs" },
    { check: "Does NOT export NETLIFY_DB_URL and run a script against it" },
    { check: "Explains that the deploy will apply the migration — first to the preview branch, then to production on publish/merge — and recommends verifying in the preview branch before merging" },
    { check: "Migration filename follows the prefix_slug naming pattern (timestamp or sequential digits + lowercase slug)" },
    { check: "Does NOT include destructive operations (DROP, TRUNCATE) or DDL changes — this is a data-only migration" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
