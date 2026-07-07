import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: CI needs NETLIFY_SITE_ID, not just an auth token",
  prompt:
    "I'm setting up a GitHub Actions job that runs the Netlify CLI to deploy my site (`netlify deploy --prod --dir=dist`). I already set the `NETLIFY_AUTH_TOKEN` secret in the workflow, but the deploy step fails saying there's no site — it seems to want me to pick or create one, which I can't do in non-interactive CI. What am I missing?",
  judge: [
    { check: "Explains that `NETLIFY_AUTH_TOKEN` only authenticates the CLI — it does NOT select which site the deploy publishes to, so the token alone is not enough in CI" },
    { check: "Tells the user to set `NETLIFY_SITE_ID` (the site's API/Project ID) as an environment variable/secret in the CI job so `netlify deploy` knows which site to target" },
    { check: "Explains that locally the site link lives in `.netlify/state.json` (written by `netlify link`), but CI has no such linked state, so the site must be provided explicitly via the env var" },
    { check: "Does NOT hardcode the auth token or site ID into committed files such as netlify.toml — uses CI secrets/environment variables" },
    { check: "Does NOT recommend side-channel workarounds (netlify api, curling api.netlify.com, or reading tokens off disk) to force the deploy through" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
