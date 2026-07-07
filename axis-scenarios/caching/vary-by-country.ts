import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: vary cached response by country",
  prompt:
    "Create a Netlify function at netlify/functions/pricing.ts mounted at /api/pricing that returns regional pricing for a fixed set of markets — the US, Germany, and Japan (everyone else gets default pricing) — based on the visitor's country (from context.geo). The response should be cached on Netlify's CDN, with a separate cached entry per those markets so visitors in different countries don't see each other's price.",
  judge: [
    { check: "Reads the country via `context.geo.country.code` (or equivalent on context.geo) — NOT from a request header parsed by hand" },
    { check: "Sets a `Netlify-Vary: country=...` header enumerating the target country codes (e.g. `country=us|de|jp`, lowercase ISO codes) so the CDN keys a separate cache entry per listed country — NOT a bare `Netlify-Vary: country`" },
    { check: "Sets a CDN cache header (`Netlify-CDN-Cache-Control` or `CDN-Cache-Control`) with a non-zero `s-maxage` so the response is actually cached at the edge" },
    { check: "Does NOT use `Vary: cookie` / a per-user cookie value to split the cache — that would fragment per-visitor and is not what was asked" },
    { check: "Does NOT rely on the function's region/location to choose pricing — uses the visitor's country as derived from context.geo" },
    { check: "Uses the modern Netlify function signature with the (req, context) form and `config.path: '/api/pricing'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
