import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: monorepo base and publish configuration",
  prompt:
    "My repo is a monorepo. The site I want to deploy on Netlify lives in `apps/web` — it has its own package.json, builds with `npm run build`, and outputs to `apps/web/dist`. Configure Netlify so it builds and deploys that subdirectory. Show me the netlify.toml.",
  judge: [
    { check: "Sets `base = \"apps/web\"` in the `[build]` section of netlify.toml (the subdirectory containing the project)" },
    { check: "Specifies the publish directory RELATIVE to base — `publish = \"dist\"`, NOT `publish = \"apps/web/dist\"`" },
    { check: "Specifies the build command (`command = \"npm run build\"`) which also runs relative to base" },
    { check: "Explains that `command` and `publish` resolve relative to `base` (so paths are not repeated with the `apps/web` prefix)" },
    { check: "Does NOT hardcode secrets, tokens, or credentials in netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
