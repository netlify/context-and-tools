import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Under-tested rule: scheduled functions have a 30-second execution timeout.
// Grounded in netlify-functions/SKILL.md (Scheduled Functions: "Scheduled
// functions have a **30-second timeout** and only run on published deploys.")
// and the Resource Limits table ("Scheduled timeout | 30 seconds").
export default {
  name: "Functions: scheduled function execution timeout",
  prompt:
    "I have a Netlify scheduled function at netlify/functions/nightly-sync.ts that runs @daily and does a batch data sync that keeps getting bigger. Lately the run seems to get cut off partway through. What is the maximum execution time for a scheduled function? Answer the question directly.",
  judge: [
    {
      check:
        "States that scheduled functions have a 30-second execution timeout — that is the maximum run time, which is why an ever-growing batch sync gets cut off partway through.",
    },
    {
      check:
        "Does NOT claim a longer limit for the scheduled function such as 15 minutes (that is a background function) or 60 seconds (that is a synchronous HTTP function).",
    },
    {
      check:
        "Does NOT invent a config option, netlify.toml setting, or plan upgrade that raises the scheduled-function timeout beyond 30 seconds.",
    },
    {
      check:
        "Does NOT blame the cut-off primarily on an unrelated cause (a cron typo, a deploy glitch, or a bundling bug).",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
