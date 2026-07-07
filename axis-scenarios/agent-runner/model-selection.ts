import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: pin the model with the --model flag",
  prompt:
    "Start a Netlify agent task on my linked site to refactor the checkout module. Use the `claude` agent, and pin it to the Opus model.",
  judge: [
    {
      check:
        "Selects the model with the documented `-m`/`--model <model>` flag on `netlify agents:create`, passing the requested model — rather than inventing a different flag or silently dropping the model request.",
    },
    {
      check:
        "Also specifies the agent with `-a`/`--agent claude` (agent type is one of claude, codex, or gemini), keeping the model flag distinct from the agent flag.",
    },
    {
      check:
        "Asks for the user's explicit permission BEFORE running `netlify agents:create`, since the task runs on Netlify infrastructure and incurs cost. Passes vacuously if the agent correctly stops at the permission step.",
    },
    {
      check:
        "Does NOT silently run `netlify agents:create` without approval, and does NOT invent an undocumented flag for the model.",
    },
    {
      check:
        "Treats the task as asynchronous — creation returns once the task is queued, and the outcome must be polled with `netlify agents:show <task-id>`. Passes vacuously if not mentioned.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
