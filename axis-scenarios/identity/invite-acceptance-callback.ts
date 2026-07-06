import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: invite acceptance flow with callback",
  prompt:
    "Users are invited to my app from the Netlify dashboard. Build the page that handles the invite link so an invited user can set a password and finish creating their account. Use Netlify Identity.",
  judge: [
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Calls `handleAuthCallback()` on page load and branches on the `invite` result type (e.g. `result.type === 'invite'`), using the `token` it returns.",
    },
    {
      check:
        "Accepts the invite and sets the password via `acceptInvite(token, password)` — not an invented endpoint or a direct GoTrue HTTP call.",
    },
    {
      check:
        "Does NOT assume `result.user` is populated for an invite callback (it is null) — the flow keys off the returned token, then prompts for a password.",
    },
    {
      check:
        "Catches the SDK's `AuthError` (or a generic catch) and surfaces a user-visible message on failure.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token, and does NOT curl `https://api.netlify.com/...` to process the invite.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
