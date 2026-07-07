import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: reuse a module-scope client instead of per-request",
  prompt: `This Netlify function throws intermittent "too many connections" / "remaining connection slots are reserved" Postgres errors under load:

\`\`\`typescript
// netlify/functions/list-orders.ts
import { getDatabase } from "@netlify/database";

export default async (req: Request) => {
  const db = getDatabase();
  const orders = await db.sql\`SELECT * FROM orders ORDER BY created_at DESC LIMIT 50\`;
  return Response.json(orders);
};

export const config = { path: "/api/orders" };
\`\`\`

Why does this exhaust connections, and how should I fix it?`,
  judge: [
    { check: "Diagnoses the cause: calling `getDatabase()` inside the handler creates a new client (and opens a new Postgres connection) on every request, so under load the connections pile up and exhaust the limit" },
    { check: "Fixes it by moving client creation to MODULE scope — a single top-level `const db = getDatabase()` reused across invocations — rather than calling it per request inside the handler" },
    { check: "Keeps using `getDatabase()` from '@netlify/database' — does NOT switch to hand-constructing a `pg.Pool`/`pg.Client` with a connection string as the fix" },
    { check: "Does NOT read NETLIFY_DB_URL / NETLIFY_DATABASE_URL directly to wire the connection — getDatabase() handles it" },
    { check: "Preserves the parameterized tagged-template query and the modern Netlify function signature/config" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
