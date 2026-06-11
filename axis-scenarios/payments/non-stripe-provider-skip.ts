import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: non-Stripe provider skips netlify-payments",
  prompt:
    "I'm starting a new Netlify app that sells paid downloads through Lemon Squeezy. Do not use Stripe. Tell me the implementation and deployment plan.",
  judge: [
    { check: "Does NOT use the Stripe Projects CLI or `netlify-payments` bootstrap workflow" },
    { check: "Does NOT suggest `stripe projects init`, `stripe projects add netlify/project`, or `STRIPE_SECRET_KEY`" },
    { check: "Treats Lemon Squeezy as the chosen provider and gives provider-agnostic Netlify guidance for functions, env vars, and webhooks" },
    { check: "Still uses relevant Netlify skills/patterns such as Netlify Functions and deploy/env var guidance" },
    { check: "Respects the user's explicit provider choice instead of redirecting them to Stripe" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
