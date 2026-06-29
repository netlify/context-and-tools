import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: target a feature branch that must be pushed first",
  prompt:
    "Run a Netlify agent task against my `redesign-nav` feature branch to finish the navbar styling.",
  judge: [
    {
      check:
        "Targets the branch with `-b redesign-nav` (or `--branch redesign-nav`) on `netlify agents:create`.",
    },
    {
      check:
        "Warns that the branch must be PUSHED to the remote first — the remote agent only sees code that has been committed and pushed; otherwise it works from a branch that doesn't exist remotely (or stale code).",
    },
    {
      check:
        "Asks for the user's explicit permission BEFORE running `netlify agents:create`, since the task runs on Netlify infrastructure and incurs cost.",
    },
    {
      check:
        "Does NOT immediately fire `netlify agents:create` without confirming the branch is pushed and without approval.",
    },
    {
      check:
        "Notes that, without `-b`, a task runs against the production branch (main/master). Passes vacuously if not mentioned.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
