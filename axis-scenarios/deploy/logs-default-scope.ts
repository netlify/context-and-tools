import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: default scope and window of `netlify logs`",
  prompt:
    "I just want a quick look at what's been happening on our linked Netlify site's serverless code in the last few minutes — I don't want to pick a specific function or set a time range, just show me the recent logs. What's the simplest `netlify` CLI command, and what will it show by default?",
  judge: [
    {
      check:
        "Gives the bare `netlify logs` command (no `--source`, `--function`, or time-range flag needed) as the simplest way to see recent logs",
    },
    {
      check:
        "Explains that with `--source` omitted, `netlify logs` defaults to both the `functions` and `edge-functions` sources",
    },
    {
      check:
        "Notes the default time window is roughly the last 10 minutes of logs",
    },
    {
      check:
        "May mention `--follow` to stream live or `--since <window>` to widen the historical window (optional, not required)",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
