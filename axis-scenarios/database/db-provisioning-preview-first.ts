import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: first deploy provisions via preview, then promote",
  prompt:
    "I've wired Netlify Database into my project — @netlify/database is installed, db/schema.ts is defined, and I have an initial migration under netlify/database/migrations/. Walk me through deploying this for the first time so the database gets provisioned and the migration is applied.",
  judge: [
    { check: "First deploy is a draft/preview deploy via `netlify deploy` WITHOUT `--prod` — does NOT go straight to `netlify deploy --prod` for the very first deploy" },
    { check: "Tells the user to confirm the deploy log shows the database was set up (e.g. a `Netlify Database setup completed` line, and `Loading migrations from netlify/database/migrations` when migrations exist) before promoting" },
    { check: "Promotes to production with `netlify deploy --prod` only AFTER the draft deploy is verified — the production deploy comes second, not first" },
    { check: "Explains that Netlify provisions the database and applies pending migrations automatically during the deploy — the user does not apply them by hand" },
    { check: "Does NOT instruct running `drizzle-kit migrate`, `drizzle-kit push`, or any migration tool against the hosted (preview or production) database" },
    { check: "Does NOT connect with `psql` / `netlify database connect` to create tables or run DDL manually as part of provisioning" },
    { check: "Does NOT curl `https://api.netlify.com/...` or run `netlify api <method>` to create or provision the database" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
