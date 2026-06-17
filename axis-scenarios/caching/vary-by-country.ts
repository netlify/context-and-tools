import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: vary cached response by country",
  prompt:
    "Create a Netlify function at netlify/functions/pricing.ts mounted at /api/pricing that returns regional pricing based on the visitor's country (from context.geo). The response should be cached on Netlify's CDN, but visitors from different countries should never see each other's cached entry.",
  judge: [
    { check: "Reads the country via `context.geo.country.code` (or equivalent on context.geo) — NOT from a request header parsed by hand" },
    { check: "Sets `Netlify-Vary: country` on the Response so the CDN keys the cache entry by country" },
    { check: "Sets a CDN cache header (`Netlify-CDN-Cache-Control` or `CDN-Cache-Control`) with a non-zero `s-maxage` so the response is actually cached at the edge" },
    { check: "Does NOT use `Vary: cookie` / a per-user cookie value to split the cache — that would fragment per-visitor and is not what was asked" },
    { check: "Does NOT rely on the function's region/location to choose pricing — uses the visitor's country as derived from context.geo" },
    { check: "Uses the modern Netlify function signature with the (req, context) form and `config.path: '/api/pricing'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
