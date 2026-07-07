import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: where Netlify finds netlify.toml in a monorepo",
  prompt:
    "I have a monorepo. There's a `netlify.toml` at the repo root with shared settings, and I just added another `netlify.toml` inside `apps/web` (the package directory for the site I'm deploying) with settings specific to that app. When Netlify builds the `apps/web` site, which `netlify.toml` does it actually use, and where should I put config so this site's settings win? Show me where the file should live.",
  judge: [
    { check: "States that Netlify searches for the `netlify.toml` in this order and uses the first one found: (1) the package directory, then (2) the base directory, then (3) the repository root" },
    { check: "Correctly resolves the described setup: the `netlify.toml` in the package directory (`apps/web`) takes precedence over the root-level one for that site" },
    { check: "Advises putting the site-specific `netlify.toml` in the package directory (the subdirectory that contains that site) so it takes precedence over any root-level config" },
    { check: "Does NOT hardcode secrets, tokens, or credentials in netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
