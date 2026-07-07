import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: path scoping to avoid intercepting static assets",
  prompt:
    "I want a Netlify edge function that injects a country-specific promo banner into the HTML of my pages, using HTMLRewriter on the response. I want it on all my pages, so I was going to set `path: '/*'`. Is that the right path config? Set it up.",
  judge: [
    { check: "Warns that `path: '/*'` matches EVERY request, including static assets (CSS, JS, images, fonts) — not just HTML pages — so the edge function runs on (and adds latency + a billed invocation to) every asset request" },
    { check: "Scopes the function so it doesn't run on static assets — either narrowing `path` to the actual page routes, or keeping a broad path but adding `excludedPath` to exclude asset patterns (e.g. '/*.css', '/*.js', image/font extensions)" },
    { check: "Uses the modern edge-function default-export (req, context) signature returning a Response, importing Config/Context from @netlify/edge-functions, with the file under netlify/edge-functions/" },
    { check: "Does NOT leave a bare `path: '/*'` with no exclusions as the final config, silently intercepting all static-asset requests" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
