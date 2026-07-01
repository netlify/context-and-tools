import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: durable cache for an expensive response",
  prompt:
    "Create a Netlify function at /api/report that builds an expensive aggregated report. Cache it on Netlify's CDN using the durable cache so the cached entry is shared across edge nodes (not re-generated independently at each one), and serve stale content while it revalidates in the background.",
  judge: [
    { check: "Sets Netlify-CDN-Cache-Control on the Response including the `durable` directive (alongside a max-age/s-maxage)" },
    { check: "Includes a stale-while-revalidate directive in the cache-control value so stale content is served during revalidation" },
    { check: "Is implemented as a SERVERLESS function under netlify/functions/ — NOT an edge function (durable cache is serverless-only and is not available on edge functions)" },
    { check: "Does NOT attempt to enable durable caching on an edge function or via netlify.toml [[headers]] (which doesn't apply to function responses)" },
    { check: "Uses the modern Netlify function signature with config.path: '/api/report'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
