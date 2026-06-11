import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: existing app skips Stripe Projects bootstrap",
  prompt:
    "This repo is an existing deployed Netlify app. Add Stripe Checkout to it for a new paid plan. Do not initialize any new projects or services; explain the right integration approach and commands for environment variables.",
  judge: [
    { check: "Does NOT run or recommend `stripe projects init`, because the prompt says the app already exists" },
    { check: "Does NOT run or recommend `stripe projects add netlify/project` as the primary path for this existing project" },
    { check: "Uses direct Stripe integration guidance with Netlify Functions or framework server routes for Checkout session creation and webhooks" },
    { check: "Sets `STRIPE_SECRET_KEY` in the existing Netlify site with `netlify env:set STRIPE_SECRET_KEY <value> --secret` or equivalent" },
    { check: "Mentions webhook signature verification and a separate webhook secret if webhooks are involved" },
    { check: "Avoids creating a new Netlify site or changing the existing deploy topology unless the user asks" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
