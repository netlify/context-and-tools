import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Agent Runner: agents commands are project-scoped, not team-global",
  prompt:
    "Give me one command to list every Netlify agent task running across all of my sites.",
  judge: [
    {
      check:
        "Explains that `netlify agents:*` commands (including `netlify agents:list`) are PROJECT-scoped — they operate on a single project (the linked directory's project, or the one named with `--project <name>`), not on the whole team/all sites at once.",
    },
    {
      check:
        "Notes there is no single command that lists tasks across ALL sites; to see another site's tasks you run from its linked directory or pass `--project <name>` for that site.",
    },
    {
      check:
        "Gives the correct per-project command: `netlify agents:list` (optionally `--status <status>` or `--json`) for the current/linked project.",
    },
    {
      check:
        "Does NOT invent an all-sites/team-global flag, nor reach for an undocumented API (curl `https://api.netlify.com/...`, `netlify api <method>`, tokens off disk) to aggregate tasks across sites.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
