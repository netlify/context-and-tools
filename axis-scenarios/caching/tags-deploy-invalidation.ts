import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: tagged responses survive deploys, purge explicitly",
  prompt:
    "Create a Netlify function at /api/catalog whose JSON response is cached on Netlify's CDN and tagged so we can purge it on demand. Key requirement: a normal site deploy must NOT automatically wipe these cached responses — they should persist across deploys and only clear when we explicitly purge by tag. Also give me a separate /api/catalog/purge endpoint that does that explicit purge.",
  judge: [
    { check: "Tags the cached response using the `Netlify-Cache-Tag` header (or `Cache-Tag`) with at least one tag like 'catalog' — does NOT use `Netlify-Cache-ID`" },
    { check: "Relies on / explains the behavior that responses carrying a cache tag are excluded from automatic deploy-based invalidation — they persist across deploys and clear only on explicit purge" },
    { check: "Sets Netlify-CDN-Cache-Control with a meaningful s-maxage so the response is durably cached at the edge (not a near-zero TTL)" },
    { check: "The /api/catalog/purge endpoint calls purgeCache({ tags: ['catalog'] }) imported from '@netlify/functions', using the SAME tag string set on the response" },
    { check: "Does NOT propose triggering a new deploy or lowering the TTL as the invalidation mechanism — the requirement is explicit, targeted, deploy-surviving cache tags" },
    { check: "Both endpoints use the modern Netlify function signature with config.path set" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
