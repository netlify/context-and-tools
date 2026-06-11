import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: browser flow boundaries",
  prompt:
    "I'm starting a new paid Netlify project with Stripe Projects from a fresh machine. Explain how to handle authentication and first-time setup flows. Do not assume the CLIs are logged in.",
  judge: [
    { check: "Checks for Stripe CLI and Netlify CLI availability before using them" },
    { check: "Uses `stripe whoami` and `netlify status` or equivalent auth checks" },
    { check: "Tells the user to complete `stripe login` themselves if unauthenticated, because it opens a browser" },
    { check: "Tells the user to complete `netlify login` themselves if unauthenticated, because it opens a browser" },
    { check: "Warns that first-time `stripe projects init` may open a browser for KYC/business verification and waits for user completion" },
    { check: "Does NOT try to script around browser login, MFA, OAuth, or KYC flows" },
    { check: "Continues the bootstrap only after explicit user confirmation for browser-driven steps" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
