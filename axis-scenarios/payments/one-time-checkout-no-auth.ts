import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: one-time checkout without auth",
  prompt:
    "I'm starting a new Netlify project named Print Drop. It sells one downloadable poster through a one-time Stripe Checkout payment. There is no login and no customer account area. Do not run commands; give me the exact bootstrap sequence and call out what you would skip.",
  judge: [
    { check: "Uses the new-project Stripe Projects bootstrap path because this is a new Stripe payment project" },
    { check: "Derives the project slug `print-drop` without asking for it" },
    { check: "Uses `stripe projects add netlify/project` and explicitly avoids the wrong `netlify/hosting` service slug" },
    { check: "Does NOT introduce Netlify Identity, OAuth, subscriptions, Connect, or a database requirement unless framing them as unnecessary for this prompt" },
    { check: "States that server-side Checkout can use only the secret key for this v1 flow and does not require pushing a publishable key unless Stripe.js/Elements is added" },
    { check: "Sets `STRIPE_SECRET_KEY` in Netlify with `--secret` and says app code must explicitly read/pass it to Stripe" },
    { check: "Uses draft deploy before production promotion" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
