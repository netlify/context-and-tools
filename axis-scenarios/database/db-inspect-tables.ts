import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  skip: true,
  name: "Database: inspect tables and columns",
  prompt:
    "List the tables in my Netlify Database, and then show the columns of the 'items' table. Use the appropriate tooling — I want to see actual output, not a script for me to run later.",
  judge: [
    { check: "Uses `netlify database connect --query \"...\"` (one-shot mode) to execute the inspection queries — NOT the interactive REPL" },
    { check: "Does NOT shell out to `psql` or another raw client with NETLIFY_DB_URL" },
    { check: "Lists tables by querying information_schema.tables (or pg_catalog) filtered to the public schema" },
    { check: "Inspects columns by querying information_schema.columns filtered by table_name = 'items'" },
    { check: "Does NOT issue any DDL (CREATE, ALTER, DROP, TRUNCATE) through `netlify database connect`" },
    { check: "Optionally passes --json to netlify database connect for machine-readable output when scripting" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
