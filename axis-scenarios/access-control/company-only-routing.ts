import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Access control: route 'employees-only + per-user identity' to the right layer",
  prompt:
    "I work at a ~2,000-person company. I want to deploy an internal dashboard on Netlify that only our employees can reach, and inside the app I need to know which employee is signed in (per-user data and roles). How should I set up auth?",
  judge: [
    {
      check:
        "Separates the two concerns explicitly: a perimeter (who can reach the site at all) vs. per-user identity inside the app — and treats them as distinct layers rather than one feature",
    },
    {
      check:
        "Recommends a single-sign-in path: invite-only Netlify Identity (where Identity itself is the gate) for a smaller team, OR the Auth0 extension federating the company's IdP for a real org. Does NOT make the Enterprise team-login perimeter + a separate Netlify Identity the default recommendation",
    },
    {
      check:
        "If it does mention stacking Password Protection / team-login + Netlify Identity, it names the double login as an explicit tradeoff (the two layers don't share a session) AND notes that team-login admits only Netlify team members, so every employee would need a paid Netlify seat",
    },
    {
      check:
        "Does NOT tell the user to register their own Google/GitHub OAuth app or wire a client_id/secret — relies on Netlify Identity's built-in providers or IdP federation via Auth0",
    },
    {
      check:
        "Treats Password Protection / SSO / Identity enablement as dashboard-only handoffs (gives the user the steps) — does NOT curl `https://api.netlify.com/...`, run `netlify api`, or read tokens off disk to configure access",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
