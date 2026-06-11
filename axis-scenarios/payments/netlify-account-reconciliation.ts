import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Payments: reconcile Netlify account after Stripe Projects link",
  prompt:
    "I'm bootstrapping a new paid Netlify app with Stripe Projects. After `stripe projects add netlify/project`, how should I verify the Netlify site is linked to the same team my local Netlify CLI can deploy to? Give commands and the halt condition.",
  judge: [
    { check: "Reads `NETLIFY_NETLIFY_SITE_ID` from `.env` after `stripe projects add netlify/project`" },
    { check: "Uses `netlify api getSite --data='{\"site_id\":\"<NETLIFY_NETLIFY_SITE_ID>\"}'` or equivalent to inspect the site's owning account" },
    { check: "Uses `netlify status` to inspect the local Netlify CLI user and team memberships" },
    { check: "Compares the site's `account_slug` or account/team identity against the teams available to the local CLI user" },
    { check: "Halts on team mismatch instead of continuing to deploy" },
    { check: "Explains the two reasonable fixes: sign the local Netlify CLI into a user on that team, or re-link Stripe Projects to the intended Netlify account" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
