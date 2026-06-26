import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: drizzle.config.ts for Netlify",
  prompt:
    "Create a drizzle.config.ts at the project root suitable for use with Netlify Database. The schema file is at db/schema.ts.",
  judge: [
    { check: "Sets `dialect: 'postgresql'`" },
    { check: "Sets `schema: './db/schema.ts'`" },
    { check: "Sets `out: 'netlify/database/migrations'` — NOT the Drizzle Kit default of 'drizzle/' or 'drizzle' or any other path. The Netlify deploy only applies migrations from this directory." },
    { check: "Does NOT force a non-timestamp migration prefix. `drizzle-kit generate` (the `@beta` line this skill pins) already defaults to timestamp prefixes, which avoid the sequential-prefix collisions that happen when multiple branches generate migrations in parallel. PASS when the config omits the `migrations` block entirely — relying on the default, as the canonical skill example does — OR sets `migrations: { prefix: 'timestamp' }` explicitly. Only FAIL if it forces a sequential/index prefix (e.g. `prefix: 'index'`)." },
    { check: "Does NOT include a `dbCredentials` block with a connection string — Netlify Database does not require one in drizzle.config.ts" },
    { check: "Uses `defineConfig` from 'drizzle-kit'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
