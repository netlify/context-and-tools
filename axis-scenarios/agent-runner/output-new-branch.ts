import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: task output lands on a new branch + Deploy Preview, not the base branch",
  prompt:
    "I started a Netlify agent task with `-b staging` to update our pricing page. Will it commit its changes straight onto my `staging` branch? Where do I go to see and review what it did?",
  judge: [
    {
      check:
        "Explains the agent does NOT commit its changes onto the base branch — its output lands on a NEW branch with its own Deploy Preview, so the existing `staging` branch is not overwritten in place.",
    },
    {
      check:
        "Clarifies that `-b`/`--branch` selects the BASE (starting) branch the agent works from, not the destination where the results are written.",
    },
    {
      check:
        "Tells the user to review the results on the new branch / Deploy Preview the task produces.",
    },
    {
      check:
        "Does NOT claim the agent pushes commits directly onto `staging` in place.",
    },
    {
      check:
        "Treats the task as asynchronous — status must be polled with `netlify agents:show <task-id>` until it reaches a terminal status like `done`. Passes vacuously if not mentioned.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
