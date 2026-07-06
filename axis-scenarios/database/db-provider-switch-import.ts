import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: one-time data import during provider switch",
  prompt:
    "We're switching from an external Postgres provider to Netlify Database. The app code already reads/writes through `@netlify/database`, and the baseline schema migration is applied to production. The last step is moving the actual production data out of the old database and into the new Netlify Database. How do I do this safely? This is advisory — just tell me the approach and commands.",
  judge: [
    { check: "Moves data by piping `pg_dump` directly into `pg_restore` (e.g. `pg_dump -Fc --data-only \"$SOURCE_DATABASE_URL\" | pg_restore --no-owner --no-acl --dbname=\"$PRODUCTION_DATABASE_URL\"`) — a direct stream, not a separately stored dump" },
    { check: "Obtains the production Netlify Database connection string via the documented CLI (`netlify database status --show-credentials`), NOT by reading tokens off disk or calling `api.netlify.com`" },
    { check: "Explicitly frames this direct production connection as the ONE documented exception (a one-time provider-switch import) and notes that ongoing production data changes go back through DML migrations afterward" },
    { check: "Warns NOT to commit the data dump to source control — pipe directly, or stage in a gitignored directory" },
    { check: "Does NOT run `drizzle-kit migrate` (or `drizzle-kit push`) against the production connection string — schema application is the deploy's job, not a manual step" },
    { check: "Recommends validating the result afterward (confirm reads/writes against the new production database, ideally rehearsing on a preview branch first)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
