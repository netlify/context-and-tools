import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Under-tested rule: when a .js and a .ts function file share the same name, the
// .js file takes precedence. Grounded in netlify-functions/SKILL.md (File
// Structure: "If both `.ts` and `.js` exist with the same name, the `.js` file
// takes precedence.").
export default {
  name: "Functions: .js-beats-.ts file precedence",
  prompt:
    "My Netlify functions directory has both netlify/functions/items.js and netlify/functions/items.ts. I keep editing items.ts but my changes never seem to take effect on the deployed function. Why would edits to items.ts have no effect, and how do I fix it?",
  judge: [
    {
      check:
        "Explains that when a .js and a .ts file share the same name in the functions directory, the .js file takes precedence — so items.js is the one that runs, which is why edits to items.ts have no effect.",
    },
    {
      check:
        "Recommends resolving the name collision so the .ts version is used — e.g. deleting or renaming the stale items.js, or consolidating to a single file.",
    },
    {
      check:
        "Does NOT blame the problem primarily on an unrelated cause (a build cache, a bundler misconfiguration, or a deploy glitch).",
    },
    {
      check:
        "Does NOT invent a config option or setting that changes the .js-over-.ts precedence.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
