import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: link or init the project before running agent tasks",
  prompt:
    "I want to run a Netlify agent task on this project, but I don't think this directory is linked to a Netlify site yet. How do I get started?",
  judge: [
    {
      check:
        "Explains the site must be linked to a Netlify project for `netlify agents:*` commands to work — via `netlify link` (to connect an existing site) or `netlify init` (to set up a new project).",
    },
    {
      check:
        "Notes the alternative: you can skip linking and target any Netlify site directly by passing `--project <name>` (a project ID or name) to `netlify agents:create`.",
    },
    {
      check:
        "Notes the Netlify CLI must be installed and authenticated.",
    },
    {
      check:
        "When it comes to creating the task, uses `netlify agents:create` and asks for the user's explicit permission first since it runs on Netlify infrastructure and incurs cost. Passes vacuously if the agent correctly stops at the linking/setup step.",
    },
    {
      check:
        "Does NOT invent an undocumented linking/targeting flag when `netlify link`, `netlify init`, and `--project <name>` are the documented paths.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
