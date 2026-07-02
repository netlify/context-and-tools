import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: breaking change via expand-and-contract",
  prompt:
    "Our Netlify Database (Drizzle) has a `users` table with a `name` column. We want to rename it to `full_name`. The app is live and serving traffic. How do I ship this rename safely so production doesn't break at cutover? Walk me through the migration steps.",
  judge: [
    { check: "Recommends the expand-and-contract pattern: add the new `full_name` column alongside the old `name` (expand), backfill and switch application code to the new column (migrate), then drop the old column once nothing reads/writes it (contract)" },
    { check: "Splits the work across SEPARATE migrations/deploys — it explicitly does NOT combine the add, backfill, and drop into one migration that renames or drops in a single shot" },
    { check: "Explains why a one-shot rename is unsafe: the preview may pass while production breaks at cutover because running code still depends on the old column" },
    { check: "Each schema change is expressed as a generated Drizzle migration (edit `db/schema.ts`, then `drizzle-kit generate` / `npm run db:generate`) committed to the repo — NOT raw `ALTER TABLE` run through `netlify database connect`, `psql`, or any direct connection" },
    { check: "Does NOT run `drizzle-kit migrate` or `drizzle-kit push` against a hosted database — the deploy applies migrations to the preview branch and then production" },
    { check: "Mentions verifying each step on the deploy preview (which forks production data) before merging to production" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
