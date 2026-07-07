import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: role change doesn't affect a live session",
  prompt:
    "I use Netlify Identity. I just added the `admin` role to an existing user in the Netlify dashboard, but they're already logged in and still can't get into the /admin area (gated with a Role redirect condition). Why isn't the new role working, and how do I fix it?",
  judge: [
    {
      check:
        "Explains that roles are baked into the user's JWT (`nf_jwt`) when the token is issued, and an already-signed-in user keeps their old roles until that token refreshes — the dashboard change does not update tokens already held by live sessions.",
    },
    {
      check:
        "Gives the correct fix: have the user log out and log back in (or otherwise refresh their token) so a new JWT carrying the `admin` role is issued.",
    },
    {
      check:
        "Notes that both the redirect `Role` condition and any function-side `app_metadata.roles` check read the current token, so both keep seeing the stale roles until the token refreshes. Passes vacuously if not mentioned.",
    },
    {
      check:
        "Does NOT claim the role change takes effect immediately for the live session, and does NOT invent a call to force-refresh another user's session or curl `https://api.netlify.com/...` to fix it.",
    },
    {
      check:
        "If it writes or references auth code, uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`. Passes vacuously if no code is involved.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
