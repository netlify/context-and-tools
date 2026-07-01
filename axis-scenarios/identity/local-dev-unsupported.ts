import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Netlify Identity does not work under `netlify dev`. The skill pushes a
// specific POSITIVE recommendation: test against a deployed site using a
// preview/draft deploy (`npx netlify deploy`). Baseline just must not claim it
// fully works locally; the strict (with-skill) run demands the positive
// preview-deploy recommendation.
const shared = [
  {
    check:
      "Recommends `@netlify/identity` for the auth code — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
  },
  {
    check:
      "Does NOT claim Netlify Identity fully works under `netlify dev`.",
  },
];

export default {
  name: "Identity: local dev is unsupported — recommend a preview deploy",
  prompt:
    "I'm building auth with Netlify Identity. How do I run and test it locally with `netlify dev`?",
  // Baseline (no-context): at minimum, don't promise it works locally.
  judge: shared,
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "States plainly that Netlify Identity does NOT currently work with `netlify dev`.",
    },
    {
      check:
        "POSITIVELY recommends testing against a deployed site — specifically a preview/draft deploy via `npx netlify deploy` — during development.",
    },
    {
      check:
        "Does NOT invent a local workaround (e.g. faking the Identity/GoTrue endpoint, curling `https://api.netlify.com/...`, or reading tokens off disk) to make it run under `netlify dev`.",
    },
  ]),
} satisfies ScenarioInput;
