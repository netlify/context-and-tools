import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: deploy-based invalidation is scoped to the deploy context",
  prompt:
    "We publish a Deploy Preview for every pull request. A teammate is worried that publishing one of those preview deploys will wipe out our production CDN cache and send a spike of traffic to our origin. Does deploying a preview invalidate the production cache? Explain how deploy-based cache invalidation is scoped on Netlify.",
  judge: [
    { check: "Explains that deploy-based cache invalidation is scoped to the deploy context (production vs preview) — it is not global across all contexts" },
    { check: "Answers the concern directly: publishing a Deploy Preview does NOT invalidate / wipe out the production CDN cache, so it won't cause a production origin traffic spike" },
    { check: "Correctly notes that a deploy invalidates the cache within its own context (e.g. a production deploy clears the production cache), consistent with static assets being invalidated on every deploy" },
    { check: "Does NOT claim that any deploy (or a preview deploy specifically) clears the cache across every deploy context at once" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
