import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: redirects cannot be scoped per deploy context",
  prompt:
    "In netlify.toml I want a redirect from `/beta/*` to `/coming-soon` (302) that applies ONLY to deploy previews and branch deploys, never to production. I was going to nest the `[[redirects]]` under `[context.deploy-preview]`. Is that the right way to scope a redirect to a context?",
  judge: [
    { check: "Explains that `[[redirects]]` (and `[[headers]]`) in netlify.toml are GLOBAL — they apply to every deploy context and cannot be scoped by nesting them under `[context.deploy-preview]` / `[context.production]`" },
    { check: "Does NOT present a `[context.deploy-preview.redirects]` block or a context-nested `[[redirects]]` as a working solution — no such construct exists" },
    { check: "Points to a per-deploy mechanism instead — e.g. generating a `_redirects` (or `_headers`) file during the preview/branch build so the rule ships only in those deploys, or handling it in an edge function" },
    { check: "Correctly notes that context scoping in netlify.toml works for keys like `[build]`, `[build.environment]`, and `[[plugins]]`, but NOT for redirects or headers" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
