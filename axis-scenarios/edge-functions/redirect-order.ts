import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: edge runs before redirects — path must match the requested URL",
  prompt:
    "My netlify.toml rewrites requests for `/dashboard` to `/app/dashboard` (status 200). I wrote a Netlify edge function that adds an `x-plan` response header and gave it `path: '/app/dashboard'`, assuming the rewrite happens first and then my edge function runs on the rewritten path. But visitors who hit /dashboard never get the header. Explain what's going on and fix the edge function so the header is added for those requests.",
  judge: [
    { check: "Explains that edge functions run BEFORE redirect/rewrite rules in Netlify's request chain, so the edge function is matched against the original requested path (/dashboard), not the rewrite target (/app/dashboard)" },
    { check: "Concludes that an edge function scoped to '/app/dashboard' never fires for a request to /dashboard, because /app/dashboard is only reached via the rewrite, which is evaluated after edge functions have already run" },
    { check: "Fixes it by scoping the edge function's `path` to the URL the client actually requests — '/dashboard' (or a pattern that matches it) — rather than the rewrite destination" },
    { check: "Does NOT claim the fix is to reorder rules, remove/move the redirect, or somehow make the edge function run on the post-rewrite path — the request-chain order (edge functions before redirects) is fixed platform behavior" },
    { check: "Uses the modern edge-function default-export (req, context) signature, sets the header on the downstream response obtained via `await context.next()`, and keeps the file under netlify/edge-functions/" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
