import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: narrow the cache key so tracking query params don't fragment it",
  prompt:
    "Create a Netlify function at netlify/functions/product.ts mounted at /api/product that returns a product's JSON based on a `?id=` query param, cached on Netlify's CDN. Important: our marketing links append tracking params like `?id=42&utm_source=newsletter&fbclid=...`, and I want the CDN cache key to depend only on `id` so those tracking params don't each create a separate cached copy. Explain why that matters and implement it.",
  judge: [
    { check: "Explains that by default the full query string is part of Netlify's CDN cache key, so `?id=42&utm_source=newsletter` and `?id=42` (and every distinct tracking-param combination) are cached as separate entries even though the response is identical — which is why the cache fragments and hit rate drops" },
    { check: "Sets `Netlify-Vary: query=id` on the response so the CDN keys the cache only on the `id` param and ignores all other query params (utm_*, fbclid, etc.), collapsing those variants onto one entry" },
    { check: "Treats `Netlify-Vary: query=<names>` as the documented mechanism to control which query params are in the cache key — does NOT propose stripping params via a redirect/rewrite or a bare `Vary` on the entire query string as the fix" },
    { check: "Keeps a CDN cache header (`Netlify-CDN-Cache-Control` or `CDN-Cache-Control`) with a non-zero s-maxage so the response is actually cached at the edge" },
    { check: "Uses the modern Netlify function signature with `config.path: '/api/product'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
