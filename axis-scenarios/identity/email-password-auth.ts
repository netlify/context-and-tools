import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Identity: email/password signup, login, and logout in the blog",
  prompt:
    "Add a tiny auth UI to this Next.js blog: a /login page with email+password login, a /signup page with email+password signup, and a header element that shows the signed-in user's email plus a logout button (or shows Login/Signup links when no one is signed in). Use Netlify Identity.",
  judge: [
    { check: "Installs and uses the `@netlify/identity` package (the modern headless API)" },
    { check: "Does NOT use the deprecated `netlify-identity-widget` package or the deprecated `gotrue-js` package" },
    { check: "Calls `handleAuthCallback()` on app mount (e.g. in a layout or root client component) so confirmation/recovery/OAuth links coming back to the site are processed" },
    { check: "Signup uses `signup(email, password, { ... })`; login uses `login(email, password)`; logout uses `logout()` — function names come from @netlify/identity, not invented" },
    { check: "Reads the current user via `getUser()` and subscribes to changes with `onAuthChange(...)` — does NOT poll or store auth state in a way that bypasses the SDK" },
    { check: "Catches the SDK's `AuthError` (or a generic catch) and surfaces a user-visible error message on failed signup/login" },
    { check: "Does NOT hardcode an Identity URL, GoTrue endpoint, or admin token in the client code" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
