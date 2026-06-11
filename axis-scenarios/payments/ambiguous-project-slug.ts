import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: ambiguous project slug clarification",
  prompt:
    "Build me a new tip jar on Netlify with Stripe. Do not run commands yet. What would you ask before bootstrapping, and what would you do after I answer?",
  judge: [
    { check: "Recognizes this as a new payment-taking project that should use the Netlify Payments / Stripe Projects bootstrap after clarification" },
    { check: "Asks for a project name or slug because `tip jar` does not identify a concrete project subject" },
    { check: "Asks only targeted setup questions, such as payment shape details and whether auth, database, or file storage are needed" },
    { check: "Does NOT ask a long unrelated interview before provisioning" },
    { check: "Says that after the user answers, it should proceed deterministically through the workflow instead of looping through repeated clarification" },
    { check: "Does not choose a random slug or run `stripe projects init` before the user supplies enough naming context" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
