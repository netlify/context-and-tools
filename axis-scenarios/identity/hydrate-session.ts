import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: hydrate the browser session after a server-side login",
  prompt:
    "I log users in server-side with Netlify Identity inside a Netlify Function, and then the browser lands back on my app with the auth cookie set. I want the browser-side session fully restored on page load — including the token refresh timers — from that server-set cookie. What should I call to bridge it into the browser session?",
  judge: [
    {
      check:
        "Recommends calling `hydrateSession()` on page load to bridge the server-set cookie into the browser session.",
    },
    {
      check:
        "Frames `hydrateSession()` as the call for exactly this case — after a server-side login (a Function login followed by a redirect) — to restore the full browser session, including token refresh timers.",
    },
    {
      check:
        "May note that `getUser()` already auto-hydrates from the `nf_jwt` cookie, so `hydrateSession()` is specifically for restoring the full session (with refresh timers). Passes vacuously if not mentioned.",
    },
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token in the client code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
