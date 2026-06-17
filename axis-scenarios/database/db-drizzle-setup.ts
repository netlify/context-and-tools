import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: Drizzle ORM setup",
  prompt:
    "Set up Netlify Database with Drizzle ORM in this project. Create the schema file with a single 'items' table (id, title, created_at), the Drizzle client, and the drizzle.config.ts. Install the required packages.",
  judge: [
    { check: "Installs drizzle-orm from the @beta dist-tag (e.g. `npm install drizzle-orm@beta`) — the latest tag does not include the netlify-db adapter" },
    { check: "Installs drizzle-kit from the @beta dist-tag as a dev dependency (e.g. `npm install -D drizzle-kit@beta`)" },
    { check: "Installs @netlify/database as a dependency" },
    { check: "Drizzle client file imports `drizzle` from 'drizzle-orm/netlify-db' — NOT from 'drizzle-orm/postgres-js', 'drizzle-orm/node-postgres', or 'drizzle-orm/neon-http'" },
    { check: "Drizzle client is created via `drizzle({ schema })` with no connection string passed in — the adapter picks the connection automatically" },
    { check: "Schema file is at db/schema.ts and defines an `items` pgTable with id, title, and created_at columns using drizzle-orm/pg-core builders" },
    { check: "Does NOT reference the deprecated @netlify/neon legacy extension or the NETLIFY_DATABASE_URL env var" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
