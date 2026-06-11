import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: new subscription bootstrap with auth",
  prompt:
    "I'm starting a new Netlify app called Studio Pass. It will sell a $10/month subscription and require members to sign in before checkout. Do not run any commands. Walk me through the bootstrap workflow you would use from an empty local project, including the Stripe and Netlify CLI commands and the points where you would stop for my input.",
  judge: [
    { check: "Treats this as a new payment-taking project and uses the `netlify-payments` bootstrap flow" },
    { check: "Starts by clarifying any missing intent before provisioning, but does NOT re-ask for the subscription payment shape, auth requirement, or project slug because the prompt already provides them" },
    { check: "Includes Stripe CLI and Netlify CLI setup/auth checks before provisioning" },
    { check: "Uses `stripe plugin install projects`, then `stripe projects init studio-pass`, then `stripe projects add netlify/project`; does NOT use `netlify/hosting`" },
    { check: "Mentions first-time Stripe Projects KYC/browser verification and waits for user completion instead of scripting around it" },
    { check: "Hands app implementation to the appropriate skills/patterns for Netlify Identity, Netlify Functions, and Stripe subscriptions rather than claiming this skill owns all app code" },
    { check: "Uses a draft deploy with `netlify deploy`, then a user checkpoint, then `netlify deploy --prod` only after explicit confirmation" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
