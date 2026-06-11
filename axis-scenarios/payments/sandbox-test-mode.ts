import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: sandbox means Stripe test mode",
  prompt:
    "For a new paid Netlify project, I want the Stripe sandbox set up through Stripe Projects. Explain what sandbox means here and give me the bootstrap commands. Do not run them.",
  judge: [
    { check: "Explains that Stripe Projects sandbox means test mode on the user's existing Stripe account, not a separate Stripe account" },
    { check: "Uses `stripe projects init <slug>` and `stripe projects add netlify/project` as the provisioning path" },
    { check: "Says Stripe Projects does not auto-inject Stripe API keys into Netlify" },
    { check: "Pulls the test-mode secret from `stripe config --list` by looking for `test_mode_api_key`" },
    { check: "Sets the Netlify env var as `STRIPE_SECRET_KEY` with `--secret`" },
    { check: "Does not mention live-mode or production Stripe keys as part of the v1 bootstrap" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
