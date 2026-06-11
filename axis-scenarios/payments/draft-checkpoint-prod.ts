import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: draft deploy checkpoint before production",
  prompt:
    "I'm at the end of a new Stripe Projects + Netlify bootstrap and the app builds locally. Give me the final deploy sequence. The app also uses Netlify Identity with Google OAuth. Do not run anything.",
  judge: [
    { check: "Runs the project build first if the project has a build command" },
    { check: "Uses `netlify deploy` without `--prod` for the first deploy" },
    { check: "Captures and surfaces the draft deploy URL for review" },
    { check: "Inserts a user checkpoint after the draft deploy for dashboard-only setup, including enabling Netlify Identity and configuring Google OAuth if needed" },
    { check: "Requires end-to-end verification of the Stripe checkout flow against test-mode keys before production" },
    { check: "Does NOT run or recommend `netlify deploy --prod` until the user explicitly confirms" },
    { check: "Promotes with `netlify deploy --prod` only after the checkpoint" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
