import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: schedule a function from netlify.toml",
  prompt:
    "I have a function at `netlify/functions/cleanup.ts`. I want it to run once a day. Configure the schedule in netlify.toml specifically — I do NOT want the schedule defined inside the function code.",
  judge: [
    { check: "Adds a per-function table keyed by the function name — `[functions.\"cleanup\"]` — with a `schedule` value" },
    { check: "Sets `schedule = '@daily'` (or an equivalent daily cron expression like `'0 0 * * *'`)" },
    { check: "The function name in the TOML key matches the file basename `cleanup` (from `cleanup.ts`)" },
    { check: "Does NOT add an in-code `export const config = { schedule: ... }` to the function — the user asked for the schedule in netlify.toml" },
    { check: "Does NOT try to schedule the function via `[[redirects]]`, `[[edge_functions]]`, or an external cron service" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
