import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: cache tags with on-demand purge",
  prompt:
    "We have a product catalog. Create GET /api/products (returns the list, cached on Netlify's CDN) and POST /api/products/:id/update (updates a single product). After an update, the product list cache must be invalidated immediately — without waiting for a deploy and without lowering the cache TTL.",
  judge: [
    { check: "GET response sets `Netlify-Cache-Tag` (or `Cache-Tag`) with at least one tag like 'products' so the response can be addressed for purge later" },
    { check: "GET response also sets `Netlify-CDN-Cache-Control` with a long-ish `s-maxage` (minutes to hours) — short enough TTL would defeat the purpose of the tagging exercise" },
    { check: "POST handler calls `purgeCache({ tags: ['products'] })` imported from '@netlify/functions'" },
    { check: "Tag string used on the response matches the tag string passed to `purgeCache` (purge only works when they agree)" },
    { check: "Does NOT attempt to invalidate by triggering a new deploy, by clearing all caches, or by lowering the TTL — those don't satisfy the 'immediate, targeted, no deploy' requirement" },
    { check: "Both endpoints use the modern Netlify function signature with `config.path` set; POST handler awaits `req.json()` if it consumes a body" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
