import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Database: 'Environment has not been configured' in local Vite dev",
  prompt:
    "I'm building a Vite + React app on Netlify with Netlify Database. When I run my Vite dev server with `npm run dev` and hit a route that calls getDatabase(), it throws `Environment has not been configured`. It works fine once deployed. How do I fix local development?",
  judge: [
    { check: "Identifies the cause: the standalone Vite dev server isn't running inside the Netlify local database environment that provides the connection, so getDatabase() has nothing to connect to" },
    { check: "Recommends the documented fix: install `@netlify/vite-plugin` so the Vite dev server can connect to the local database — or, alternatively, run the app via `netlify dev`" },
    { check: "Does NOT tell the user to work around it by manually setting or hardcoding NETLIFY_DB_URL (or another connection string) in a .env file or in code" },
    { check: "Does NOT suggest pointing local dev at the remote/production database to get around the error" },
    { check: "Keeps using `getDatabase()` from '@netlify/database' — does NOT switch to hand-constructing a pg client/pool as the fix" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
