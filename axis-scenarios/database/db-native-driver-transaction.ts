import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: native-driver transaction on a single pooled connection",
  prompt:
    "Without using Drizzle, write a Netlify function at netlify/functions/create-order.ts that inserts one row into the `orders` table and one or more rows into the `order_items` table as a single atomic transaction — if any insert fails, none of them should be committed. Use the @netlify/database native driver.",
  judge: [
    { check: "Imports `getDatabase` from '@netlify/database' and obtains the db client via `getDatabase()`" },
    { check: "Runs the transaction on a single dedicated connection checked out from the pool with `const client = await db.pool.connect()` — it does NOT try to run the transaction through `db.sql` tagged-template calls" },
    { check: "Issues `BEGIN`, the INSERTs, and `COMMIT` all through that same `client` (e.g. `client.query('BEGIN')` ... `client.query('COMMIT')`) so they execute on one connection — does NOT scatter BEGIN/COMMIT across separate calls that could land on different pooled connections" },
    { check: "On error, rolls the transaction back with `client.query('ROLLBACK')` inside a catch block" },
    { check: "Releases the connection with `client.release()` in a finally block" },
    { check: "Uses parameterized queries ($1, $2 placeholders with a values array) — does NOT string-interpolate or concatenate values into the SQL" },
    { check: "Does NOT hand-construct a `pg.Pool`/`pg.Client` from a connection string, and does NOT read NETLIFY_DB_URL / NETLIFY_DATABASE_URL to wire the connection — getDatabase() provides the pool" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
