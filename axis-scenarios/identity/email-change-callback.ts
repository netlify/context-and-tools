import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: email change confirmation callback",
  prompt:
    "Add an account settings page where a logged-in user can change their email with Netlify Identity, and make sure the confirmation link they receive actually finishes the change when they click it.",
  judge: [
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Processes the confirmation link by calling `handleAuthCallback()` on load and handling the `email_change` result type (e.g. `result.type === 'email_change'`), and/or finalizing with `verifyEmailChange(token)` — not an invented endpoint.",
    },
    {
      check:
        "Initiates the change through the SDK (e.g. `updateUser({ email: newEmail })`) rather than a hand-built endpoint. Passes vacuously if the answer focuses only on handling the confirmation callback.",
    },
    {
      check:
        "Reflects that the user must be logged in when clicking the verification link for the email change to complete. Passes vacuously if not addressed.",
    },
    {
      check:
        "Catches the SDK's `AuthError` (or a generic catch) and surfaces a user-visible message on failure.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token in the client code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
