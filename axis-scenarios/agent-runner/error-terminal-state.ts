import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: an `error` status is a terminal failure to inspect, not to wait on",
  prompt:
    "I've been polling my Netlify agent task and `netlify agents:show` now reports its status as `error`. What does that mean and what should I do?",
  judge: [
    {
      check:
        "Explains that `error` is a TERMINAL status meaning the task failed — a task moves `new` → `running` → one of `done`, `error`, or `cancelled`.",
    },
    {
      check:
        "Advises inspecting the failure on that task — e.g. `netlify agents:show <task-id>` (optionally `--json`) — to see what went wrong.",
    },
    {
      check:
        "Because `error` is terminal, does NOT tell the user to keep polling/waiting for the same task to finish or to expect it to move on to `done`.",
    },
    {
      check:
        "Does NOT fabricate task output or claim the task succeeded — an errored task did not produce a successful result.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
