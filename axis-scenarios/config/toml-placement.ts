import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: where netlify.toml goes in a monorepo",
  prompt:
    "I have a monorepo with several packages. The deployable site lives in `apps/web`. Where in the repo should the `netlify.toml` file go, and how do I tell Netlify that the site is under `apps/web`?",
  judge: [
    { check: "States that `netlify.toml` belongs at the repository root, or — for a monorepo — at the base directory of the project" },
    { check: "Uses a `[build]` block with `base = 'apps/web'` to point Netlify at the project's subdirectory" },
    { check: "Does NOT invent an incorrect location for netlify.toml (e.g. a `.netlify/` folder, `node_modules`, or some other hidden config directory)" },
    { check: "Does NOT claim a monorepo needs multiple netlify.toml files or that netlify.toml cannot live at the repository root" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
