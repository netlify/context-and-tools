import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: OAuth-only by omitting the email/password form",
  prompt:
    "I want my Netlify Identity app to be Google-only: users should only be able to sign in with Google, with no email/password login at all. How do I turn off email/password and make the app Google-only?",
  judge: [
    {
      check:
        "Explains there is no 'Email provider' toggle to disable email/password — it is always available as a login method in Identity; the settings only expose External providers for OAuth.",
    },
    {
      check:
        "Says the way to make it OAuth-only is to omit the email/password form from the front-end UI (render only the Google sign-in) — the front-end is the gate.",
    },
    {
      check:
        "Wires the Google sign-in through `oauthLogin('google')` (the SDK's OAuth entry point), not a hand-built `/authorize` URL or a from-scratch OAuth flow.",
    },
    {
      check:
        "Does NOT claim there is a dashboard or API setting that disables email/password, and does NOT tell the user to register their own Google OAuth app / supply a client_id + secret — the Google provider is enabled in the dashboard with the 'Use Netlify's app' option.",
    },
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Does NOT hardcode a Google client ID, OAuth secret, redirect URI, or Identity endpoint URL in the frontend code. Passes vacuously if no such values appear.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
