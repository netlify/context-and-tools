import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: inspect tables and columns",
  prompt:
    "I have a Netlify Database. Show me how to list its tables and then inspect the columns of the 'items' table — give me the exact commands to run.",
  judge: [
    { check: "Uses `netlify database connect --query \"...\"` (one-shot mode) to run the inspection queries — NOT the interactive REPL" },
    { check: "Does NOT shell out to `psql` or another raw client with NETLIFY_DB_URL" },
    { check: "Lists tables by querying information_schema.tables (or pg_catalog) filtered to the public schema" },
    { check: "Inspects columns by querying information_schema.columns filtered by table_name = 'items'" },
    { check: "Does NOT issue any DDL (CREATE, ALTER, DROP, TRUNCATE) through `netlify database connect`" },
    { check: "Optionally passes --json to netlify database connect for machine-readable output when scripting" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
