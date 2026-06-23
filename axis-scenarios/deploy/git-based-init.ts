import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: Git-based CI/CD initialization",
  prompt:
    "I have a project already on GitHub and I want Netlify to auto-deploy on every push to main, with preview deploys for pull requests. Walk me through the commands to set this up with the Netlify CLI from my local checkout. No need to write app code.",
  judge: [
    { check: "Authenticates with `netlify login` first (or notes the `NETLIFY_AUTH_TOKEN` CI alternative)" },
    { check: "Runs `netlify init` (without `--manual`) — that is the variant that wires up the Git CI/CD trigger" },
    { check: "Does NOT instruct the user to run `netlify deploy --prod` from their laptop as the primary production deploy mechanism — production deploys happen on Netlify when main is pushed" },
    { check: "Explains that PR / branch deploys generate preview URLs automatically once the site is connected (the user does not configure each PR by hand)" },
    { check: "Does NOT include credentials, OAuth tokens, or Git remote URLs hardcoded into netlify.toml" },
    { check: "Recommends configuring the build command and publish directory either via `netlify init` prompts or by committing a netlify.toml" },
    { check: "Adds `.netlify` to `.gitignore` (or equivalent guidance to not commit `.netlify/state.json`) — passes vacuously if the agent never creates that directory in their flow" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
