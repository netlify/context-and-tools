import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: `netlify dev` never fires a scheduled function on its cron. Waiting
// for the clock locally does nothing; you invoke it on demand with
// `netlify functions:invoke`. Grounded in netlify-functions/SKILL.md
// (Scheduled Functions -> "Testing and triggering").
export default {
  name: "Functions: testing a scheduled function locally",
  prompt:
    "I created a Netlify scheduled function at netlify/functions/report.ts configured to run @hourly. I ran `netlify dev` and left it open past the top of the hour, but the function never ran and nothing logged. Is my schedule wrong, and how do I actually test this function locally?",
  judge: [
    {
      check:
        "Explains that `netlify dev` does NOT run scheduled functions on their cron schedule — the local dev server never fires the schedule, so waiting for the clock is expected to do nothing. The schedule config itself is not necessarily wrong.",
    },
    {
      check:
        "Recommends invoking the function directly to test it locally via the CLI `netlify functions:invoke` command (naming the function), rather than waiting for the schedule.",
    },
    {
      check:
        "Does NOT invent a config flag, netlify.toml setting, or CLI option that makes scheduled functions fire on their cron under local dev, and does NOT tell the user to just wait longer.",
    },
    {
      check:
        "Does NOT blame the missing run on an unrelated cause (a typo in the cron/schedule, a deploy glitch, a bundling bug) as the primary explanation.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
