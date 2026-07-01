import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: stale-while-revalidate window",
  prompt:
    "Create a Netlify function at netlify/functions/feed.ts mounted at /api/feed that returns a JSON activity feed. Cache it on Netlify's CDN for 60 seconds. After it goes stale, keep serving the stale copy for up to 5 more minutes while it refreshes in the background, so a visitor never has to wait on a regeneration.",
  judge: [
    { check: "Sets Netlify-CDN-Cache-Control (or CDN-Cache-Control) with a fresh window of ~60 seconds (max-age=60 or s-maxage=60)" },
    { check: "Includes stale-while-revalidate=300 (the 5-minute background-refresh window) in the same cache-control value" },
    { check: "Does NOT rely on a plain `Cache-Control` header alone without the stale-while-revalidate directive — the SWR behavior is the whole point" },
    { check: "Cache headers are set on the Response returned by the handler, not in netlify.toml [[headers]] (which doesn't apply to function responses)" },
    { check: "Uses the modern Netlify function signature with config.path: '/api/feed'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
