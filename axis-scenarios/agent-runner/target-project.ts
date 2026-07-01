import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: target a named project from outside its directory",
  prompt:
    "I'm not inside my linked site directory right now. Kick off a Netlify agent task on my site named `acme-marketing` to add alt text to all the images.",
  judge: [
    {
      check:
        "Targets the site explicitly with `--project acme-marketing` (the `--project` flag accepts a project ID or name) since the user is not in a linked directory.",
    },
    {
      check:
        "Builds a `netlify agents:create` command with the prompt, ideally specifying an agent via `-a`/`--agent` (claude, codex, or gemini).",
    },
    {
      check:
        "Asks for the user's explicit permission BEFORE running `netlify agents:create` — the task runs on Netlify infrastructure and incurs cost.",
    },
    {
      check:
        "Does NOT silently run `netlify agents:create` without approval, and does NOT invent a different targeting flag (e.g. `--site`) when `--project` is the documented one.",
    },
    {
      check:
        "Treats the task as asynchronous — notes that creation returns once queued and the outcome must be polled with `netlify agents:show <task-id>`. Passes vacuously if the agent correctly stops at the permission step.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
