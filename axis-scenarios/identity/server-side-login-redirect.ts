import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: full-page navigation after a server-side login",
  prompt:
    "My Next.js app logs the user in server-side by calling Netlify Identity's `login()` inside a Netlify Function, which sets the auth cookie. After it succeeds I send the user to /dashboard with the Next.js router (`router.push('/dashboard')`), but the dashboard still thinks nobody is logged in. Why, and how should I do the redirect?",
  judge: [
    {
      check:
        "Recommends a full-page navigation after the server-side login — `window.location.href = '/dashboard'` (a full reload) — rather than the Next.js client router (`router.push` / `<Link>`).",
    },
    {
      check:
        "Explains that the server-side mutation sets the `nf_jwt` cookie in the Functions runtime, and only a full page navigation makes the browser send that new cookie on the next request — a client-router navigation doesn't, which is why the dashboard sees no session.",
    },
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "May additionally mention restoring the browser session with `hydrateSession()` (or that `getUser()` auto-hydrates from the cookie). Passes vacuously if not mentioned.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token in the client code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
