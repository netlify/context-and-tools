import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: vary cache entry by cookie and query param",
  prompt:
    "Create a Netlify function at netlify/functions/dashboard.ts mounted at /api/dashboard. Its output depends on the visitor's `plan` cookie (values are free / pro / enterprise) and on a `?theme=` query parameter. Cache the response on Netlify's CDN, but make sure each distinct combination of plan and theme gets its own cache entry — and nothing else should fragment the cache.",
  judge: [
    { check: "Sets a single `Netlify-Vary` header that keys the cache on the `plan` cookie and the `theme` query param — e.g. `Netlify-Vary: query=theme, cookie=plan`" },
    { check: "Uses the documented Netlify-Vary syntax (`cookie=<name>`, `query=<name>`) — NOT a generic `Vary: Cookie` / `Vary: *` header, which would fragment the cache far more broadly" },
    { check: "Keys the cookie dimension by the specific cookie NAME (`plan`), not by the entire raw Cookie header (which would create a separate entry per visitor)" },
    { check: "Sets a CDN cache header (Netlify-CDN-Cache-Control or CDN-Cache-Control) with a non-zero s-maxage so the response is actually cached at the edge" },
    { check: "Uses the modern Netlify function signature with config.path: '/api/dashboard'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
