import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: netlify.toml overrides UI build settings",
  prompt:
    "I changed my build command and publish directory in the Netlify dashboard UI and triggered a new deploy, but the build keeps using the OLD values — like my dashboard edit did nothing. My repo does have a committed `netlify.toml` with `[build]` settings in it. Why is the dashboard change being ignored, and how do I actually change these settings?",
  judge: [
    { check: "Explains that file-based configuration in `netlify.toml` takes precedence over the equivalent build settings in the Netlify UI — when the same option is set in both places, the committed `netlify.toml` value wins" },
    { check: "Diagnoses the specific symptom correctly: the dashboard edit has no effect because the committed `netlify.toml` is overriding it on every build" },
    { check: "Tells the user to update the values in `netlify.toml` and commit/redeploy, rather than only editing the dashboard" },
    { check: "Does NOT hardcode secrets, tokens, or credentials in netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
