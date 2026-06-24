import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: CDN cache with always-revalidating browser",
  prompt:
    "Create a Netlify function at netlify/functions/featured.ts mounted at /api/featured that returns a JSON list of featured products. Cache the response at Netlify's CDN for one minute, but make sure the browser always revalidates with the CDN (no stale data in the user's tab).",
  judge: [
    { check: "Sets `Netlify-CDN-Cache-Control` (or `CDN-Cache-Control`) on the Response with a non-zero `s-maxage` / `max-age` around 60 — controls only the CDN, stripped from the client response" },
    { check: "Sets a separate browser `Cache-Control` with `max-age=0` (or `no-cache`) and `must-revalidate` so browsers always re-check" },
    { check: "Does NOT rely on a single `Cache-Control` header to do both jobs — that would either skip the CDN or cache in the browser" },
    { check: "Cache headers are attached to the Response returned by the handler (not in netlify.toml `[[headers]]`, which doesn't apply to function responses)" },
    { check: "Response body is JSON and deterministic for the same URL (no per-request randomness that would make caching pointless)" },
    { check: "Uses the modern Netlify function signature with `config.path: '/api/featured'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
