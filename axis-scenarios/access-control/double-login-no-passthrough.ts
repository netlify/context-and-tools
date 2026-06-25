import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Access control: don't fabricate an SSO-to-Identity passthrough",
  prompt:
    "My Netlify site is behind team-login SSO so only our team can load it, and I also set up Netlify Identity inside the app. Users have to log in twice — once at the SSO gate and again in the app. How do I make passing the SSO gate automatically log them into the app so they only sign in once?",
  judge: [
    {
      check:
        "States there is NO supported passthrough between the Secure Access / team-login perimeter session and the Netlify Identity session today — no shared cookie, header forwarding, or JWT exchange — so the double login can't simply be wired away",
    },
    {
      check:
        "Does NOT fabricate a bridge that reads the perimeter/SSO session and mints or populates an `nf_jwt`, and does NOT claim Netlify Identity can consume the perimeter token",
    },
    {
      check:
        "Notes that the perimeter authenticates a Netlify team member, which is a different identity from an app end-user Netlify Identity record — so even a hand-rolled bridge would encode the wrong identity",
    },
    {
      check:
        "Redirects to a real single-sign-in architecture: external-IdP federation via the Auth0 extension, or invite-only Netlify Identity as the gate, instead of stacking the two layers",
    },
    {
      check:
        "Does NOT recommend the unofficial, dormant `netlify-plugin-identity-sso` as a production fix (passes vacuously if it is never mentioned)",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
