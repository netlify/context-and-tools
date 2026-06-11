import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: native driver query",
  prompt:
    "Without using Drizzle, write a Netlify function at netlify/functions/find-user.ts that handles GET /api/users?email=<email>, looks up a row in the users table by email, and returns it as JSON. Use the @netlify/database native driver.",
  judge: [
    { check: "Imports `getDatabase` from '@netlify/database'" },
    { check: "Calls `getDatabase()` to get the db client — does NOT manually construct a `pg.Pool` or `pg.Client` with a connection string" },
    { check: "Does NOT read NETLIFY_DB_URL or NETLIFY_DATABASE_URL from process.env / Netlify.env to wire the connection — getDatabase() handles it" },
    { check: "Executes the lookup with a tagged-template `db.sql\\`SELECT ... WHERE email = ${email}\\`` — parameters are bound via the tagged template, NOT string-interpolated" },
    { check: "Does NOT concatenate or template-string the email value directly into the SQL string (no SQL-injection-shaped code)" },
    { check: "Uses the modern Netlify function signature: default export async handler accepting a Web API Request and returning a Response" },
    { check: "Exports a config with path: '/api/users' (or equivalent that mounts the function at the requested route)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
