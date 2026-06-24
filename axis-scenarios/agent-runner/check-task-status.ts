import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: check a running task's status on documented surfaces only",
  prompt:
    "Earlier I kicked off a Netlify agent task to add documentation to this site. How do I check whether it's finished and see what it produced?",
  judge: [
    { check: "Tells the user to check the task with `netlify agents:show <task-id>` (and/or list tasks with `netlify agents:list`, optionally `--status <status>` or `--json`)" },
    { check: "Explains there are no callbacks or webhooks — you have to POLL until the status is terminal, then review the results" },
    { check: "Identifies the task statuses (new, running, done, error, cancelled) — at minimum that `done` means it finished successfully and `error` means it failed — and says to inspect the output once it reaches `done`" },
    { check: "Does NOT invent an undocumented way to fetch the task or its results: no curling `https://api.netlify.com/...`, no `netlify api <method>`, no reading auth tokens from `~/Library/Preferences/netlify/config.json` or anywhere on disk" },
    { check: "Does NOT claim the task is finished or describe results it cannot see — checking status comes first" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
