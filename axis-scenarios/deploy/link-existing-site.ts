import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: link a local repo to an existing Netlify site",
  prompt:
    "I already created a Netlify site in the dashboard, and it's connected to my GitHub repo. I just cloned that repo locally and want to link this checkout to that existing site so the CLI knows which site it is. I do NOT want to create a new site. What commands do I run?",
  judge: [
    { check: "Links to the existing site with `netlify link` — preferably `netlify link --git-remote-url <repo-url>` so the CLI matches the site by its connected Git remote" },
    { check: "Does NOT use `netlify init` or `netlify sites:create` as the primary path — those create a NEW site, which the prompt explicitly forbids. `netlify init` may appear only as a fallback if no matching site is found." },
    { check: "Authenticates with `netlify login` (or notes `NETLIFY_AUTH_TOKEN`) if the CLI isn't already authenticated" },
    { check: "Notes that the link is stored in `.netlify/state.json` and that `.netlify` should be gitignored (passes vacuously if not raised)" },
    { check: "Does NOT hardcode the site ID, credentials, or tokens into committed config such as netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
