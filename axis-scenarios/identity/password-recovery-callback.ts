import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: password recovery flow with callback",
  prompt:
    "Build a password reset flow for my app using Netlify Identity: a 'forgot password' form that emails a reset link, and a page that handles the link the user clicks and lets them set a new password.",
  judge: [
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Sends the reset email by calling `requestPasswordRecovery(email)` — not a hand-built endpoint or invented function name.",
    },
    {
      check:
        "On the page the reset link lands on, calls `handleAuthCallback()` on load and branches on the `recovery` result type (e.g. `result.type === 'recovery'`) to show the new-password form.",
    },
    {
      check:
        "Sets the new password via `updateUser({ password: newPassword })` — not an invented `resetPassword()` call or a direct GoTrue/Identity HTTP request.",
    },
    {
      check:
        "Catches the SDK's `AuthError` (or a generic catch) and surfaces a user-visible message on failure.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or an admin token in the client code.",
    },
    {
      check:
        "Does NOT tell the user to test this against `netlify dev` — Identity does not work in local dev; it must be exercised on a deployed site. Passes vacuously if local dev is not mentioned.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
