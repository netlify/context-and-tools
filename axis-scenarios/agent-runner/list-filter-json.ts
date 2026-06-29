import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: list running tasks as JSON for scripting",
  prompt:
    "From a script, how do I list just the Netlify agent tasks that are still running, in a machine-readable format I can parse?",
  judge: [
    {
      check:
        "Uses `netlify agents:list` to enumerate tasks.",
    },
    {
      check:
        "Filters to running tasks with `--status running` (a valid status value).",
    },
    {
      check:
        "Adds `--json` so the output is machine-readable / parseable by the script rather than scraping the human-readable table.",
    },
    {
      check:
        "Uses only valid status values (new, running, done, error, cancelled) and does NOT invent a status like `in-progress` or `pending`.",
    },
    {
      check:
        "Does NOT reach for an undocumented surface — no curling `https://api.netlify.com/...`, no `netlify api <method>`, no reading tokens off disk.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
