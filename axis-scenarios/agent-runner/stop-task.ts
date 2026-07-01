import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: cancel a running task",
  prompt:
    "I started a Netlify agent task by mistake and want to cancel it before it finishes. I have the task ID. How?",
  judge: [
    {
      check:
        "Uses `netlify agents:stop <task-id>` to cancel the task.",
    },
    {
      check:
        "Notes the task ends in the `cancelled` terminal status (one of done/error/cancelled), and that you confirm by polling `netlify agents:show <task-id>` (or `netlify agents:list`).",
    },
    {
      check:
        "Does NOT invent a different command such as `agents:kill`, `agents:delete`, or `agents:cancel` — the documented command is `agents:stop`.",
    },
    {
      check:
        "Does NOT try to stop the task by curling `https://api.netlify.com/...`, running `netlify api <method>`, or reading tokens off disk.",
    },
    {
      check:
        "Does NOT claim a webhook/callback will confirm the cancellation — there are no callbacks, so status is confirmed by polling.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
