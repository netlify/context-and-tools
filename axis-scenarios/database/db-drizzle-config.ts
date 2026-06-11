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
    { check: "Sets `migrations: { prefix: 'timestamp' }` to avoid sequential-prefix collisions when multiple branches generate migrations in parallel" },
    { check: "Does NOT include a `dbCredentials` block with a connection string — Netlify Database does not require one in drizzle.config.ts" },
    { check: "Uses `defineConfig` from 'drizzle-kit'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
