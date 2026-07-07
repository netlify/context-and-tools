import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: tagged responses survive deploys, purge explicitly",
  prompt:
    "Create a Netlify function at /api/catalog whose JSON response is cached on Netlify's CDN and tagged so we can purge it on demand. Key requirement: a normal site deploy must NOT automatically wipe these cached responses — they should persist across deploys and only clear when we explicitly purge by tag. Also give me a separate /api/catalog/purge endpoint that does that explicit purge.",
  judge: [
    { check: "Sets a `Netlify-Cache-ID` header on the cached response with a stable id like 'catalog' — this both opts the response out of automatic deploy-based invalidation AND registers the id as a purge tag" },
    { check: "Does NOT rely on `Netlify-Cache-Tag` to survive deploys — that header is purge-only and its responses are still wiped by automatic deploy-based invalidation" },
    { check: "Relies on / explains the behavior that a response carrying `Netlify-Cache-ID` is excluded from automatic deploy-based invalidation — it persists across deploys and clears only on explicit purge" },
    { check: "Sets Netlify-CDN-Cache-Control with a meaningful s-maxage so the response is durably cached at the edge (not a near-zero TTL)" },
    { check: "The /api/catalog/purge endpoint calls purgeCache({ tags: ['catalog'] }) imported from '@netlify/functions', using the SAME id string set as the response's `Netlify-Cache-ID` (the id doubles as a purge tag)" },
    { check: "Does NOT propose triggering a new deploy or lowering the TTL as the invalidation mechanism — the requirement is explicit, targeted, deploy-surviving caching" },
    { check: "Both endpoints use the modern Netlify function signature with config.path set" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
