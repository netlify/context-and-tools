import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: purge the entire site cache from a deployed function",
  prompt:
    "Build an admin 'Clear all cache' endpoint: a Netlify function at netlify/functions/flush-cache.ts mounted at /api/admin/flush-cache that flushes our ENTIRE site's CDN cache in one shot (not just a single tag). It runs as a normal deployed Netlify function. Keep it as simple as possible.",
  judge: [
    { check: "Calls `purgeCache()` imported from `@netlify/functions` with NO arguments (no `tags`) — an argument-less `purgeCache()` purges the entire site cache, which matches the 'clear all cache' requirement" },
    { check: "Does NOT scope the purge to specific cache tags — the requirement is to flush the whole site, not a subset" },
    { check: "Relies on `purgeCache()` picking up the site ID and credentials automatically because it runs inside a deployed Netlify Function — it does NOT require passing a `token`/`siteID` or hardcoding a Netlify token for this in-function call" },
    { check: "Uses the modern Netlify function signature with `config.path: '/api/admin/flush-cache'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
