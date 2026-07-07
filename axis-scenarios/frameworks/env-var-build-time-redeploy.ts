import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: env vars are injected at BUILD time. Client-prefixed vars are inlined
// into the browser bundle, and even server-side/function reads don't pick up a new
// dashboard value until a redeploy. Grounded in netlify-frameworks/SKILL.md
// ("Environment Variable Changes Require a Redeploy").
export default {
  name: "Frameworks: env var change not reflected until redeploy",
  prompt:
    "I updated VITE_API_URL in the Netlify dashboard for my deployed Vite + React site, but the live site still calls the old URL. I also changed a server-side API_TOKEN that one of my Netlify Functions reads, and the function is still using the old value. Nothing in my code hardcodes the old values. What's going on and how do I fix it?",
  judge: [
    {
      check:
        "Explains that client-prefixed vars like `VITE_API_URL` are inlined into the client bundle at build time, so the old value is baked into the already-deployed JavaScript.",
    },
    {
      check:
        "States that env var changes made in the Netlify UI/CLI only take effect after a new build/deploy — including for server-side/function env vars, which do NOT pick up the new value on the next request without a redeploy.",
    },
    {
      check:
        "Identifies the fix as triggering a redeploy (rebuild) so both the client bundle and the functions pick up the new values.",
    },
    {
      check:
        "Attributes the stale values to build-time injection / the missing redeploy — does NOT blame a code bug or point to browser caching as the root cause.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
