import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: Stripe secret extraction and wiring",
  prompt:
    "A new Stripe Projects + Netlify app is created and `.env` has `NETLIFY_NETLIFY_SITE_ID`. Show the exact steps to get the Stripe test secret into Netlify and explain how Netlify Function code should pass it to the Stripe SDK.",
  judge: [
    { check: "Uses `stripe config --list` to find `test_mode_api_key` instead of expecting Stripe Projects to write Stripe keys to `.env`" },
    { check: "Links the Netlify CLI to the provisioned site with `netlify link --id \"$NETLIFY_NETLIFY_SITE_ID\"` or equivalent" },
    { check: "Sets `STRIPE_SECRET_KEY` via `netlify env:set STRIPE_SECRET_KEY <test-mode-key> --secret`" },
    { check: "States that `STRIPE_SECRET_KEY` is the skill's convention and not an automatically read Stripe SDK default" },
    { check: "Shows explicit SDK wiring such as `new Stripe(Netlify.env.get(\"STRIPE_SECRET_KEY\"))` in a Netlify Function or equivalent language-specific configuration" },
    { check: "Does NOT use `process.env.STRIPE_SECRET_KEY` as the preferred Netlify Function access pattern" },
    { check: "Does NOT commit the secret to `.env`, `netlify.toml`, or source code" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
