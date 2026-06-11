import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Identity: Google OAuth login button",
  prompt:
    "Add a 'Sign in with Google' button to this Next.js blog. Put it on a new /login page and use Netlify Identity for the OAuth flow. When the user lands back on the site after Google approves, the session should be picked up automatically.",
  judge: [
    { check: "Imports from `@netlify/identity` (NOT `netlify-identity-widget` or `gotrue-js`)" },
    { check: "Button click handler calls `oauthLogin('google')` (or the SDK's documented OAuth provider entry point) — does NOT redirect to a hand-built `/authorize?provider=google` URL" },
    { check: "App calls `handleAuthCallback()` on mount in the page/component the OAuth redirect lands on, so the URL hash from Google's redirect is consumed and turned into a session" },
    { check: "Does NOT hardcode a Google client ID, OAuth secret, or redirect URI in the frontend — those are configured in the Netlify Identity dashboard, not the code" },
    { check: "After login, the app checks for the current user via `getUser()` (which never throws) and renders signed-in UI" },
    { check: "Optionally calls `getSettings()` to check whether the Google provider is enabled before rendering the button — passes vacuously if the button is rendered unconditionally" },
    { check: "Does NOT instruct the user to run the auth flow against `netlify dev` — Netlify Identity does not work in local dev and must be exercised against a deployed site" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
