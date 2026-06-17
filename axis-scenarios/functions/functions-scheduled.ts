import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: scheduled function",
  prompt:
    "Create a Netlify scheduled function at netlify/functions/cleanup.ts that runs every hour and logs the next_run timestamp from the request body.",
  judge: [
    { check: "Uses default export async handler — not exports.handler or a named handler export" },
    { check: "Exports a config with schedule: '@hourly' (or the equivalent cron expression '0 * * * *')" },
    { check: "Awaits req.json() and reads next_run from the parsed body before logging it" },
    { check: "Imports Config (and optionally Context) types from @netlify/functions" },
    { check: "Does NOT add a -background suffix to the filename — scheduled is distinct from background" },
    { check: "Does not use process.env; if env vars are referenced, uses Netlify.env.get()" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
