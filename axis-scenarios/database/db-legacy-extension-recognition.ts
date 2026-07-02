import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

const sharedChecks = [
  { check: "Adds the new query using the project's existing `@netlify/neon` client and the `NETLIFY_DATABASE_URL` env var — does NOT rewrite the data layer to a different driver to add one query" },
  { check: "Does NOT install `@netlify/database` alongside `@netlify/neon` (mixing the two packages creates two databases and two env vars)" },
  { check: "Does NOT switch the project's code to read `NETLIFY_DB_URL` — that is the GA product's env var, not this legacy extension's `NETLIFY_DATABASE_URL`" },
  { check: "Does NOT run raw `psql`, curl `api.netlify.com`, or read tokens off disk to inspect or query the database" },
];

export default {
  name: "Database: recognize and keep a legacy @netlify/neon project working",
  prompt:
    "Add a query to fetch the 10 most recent orders to our Netlify project. Our package.json depends on `@netlify/neon` and our existing data code reads the connection from `NETLIFY_DATABASE_URL`. Wire up the new query the way the rest of the codebase already does it, and flag anything I should know about this database setup.",
  setup: copyFixture("neon-legacy"),
  judge: sharedChecks,
  variants: withSkillVariantsStrict([
    ...sharedChecks,
    { check: "Recognizes that `@netlify/neon` + `NETLIFY_DATABASE_URL` means the project is on the deprecated legacy Netlify DB extension — distinct from the current GA Netlify Database product" },
    { check: "Proactively notes that the extension is deprecated and encourages switching to Netlify Database (GA), while making clear it should NOT perform the switch unprompted — the immediate task is just adding the query" },
  ]),
} satisfies ScenarioInput;
