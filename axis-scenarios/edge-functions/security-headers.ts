import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: inject security headers into every response",
  prompt:
    "Create a Netlify edge function that runs on every page (not /api/* or /.netlify/*) and adds these response headers to whatever the origin returns: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.",
  judge: [
    { check: "File lives under `netlify/edge-functions/`" },
    { check: "Calls `await context.next()` to fetch the downstream response, then mutates / clones it with the new headers — does NOT fabricate a Response from scratch (which would lose the page body)" },
    { check: "Adds all three required headers to the response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`" },
    { check: "Config scopes the function to all paths (e.g. `path: '/*'`) and excludes /api and /.netlify via `excludedPath` (string or array) — NOT by branching inside the function body" },
    { check: "Returns the modified response (rather than returning `undefined`, which would skip the header injection)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
