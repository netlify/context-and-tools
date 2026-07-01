import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Headers-in-code scenario: response headers for dynamic compute belong on the
// Response, not in `[[headers]]`. Grounded in netlify-config/SKILL.md: "Headers
// apply only to files served from Netlify's CDN (not to function or edge function
// responses — set those in code)."
export default {
  name: "Functions: set response headers in code, not via [[headers]]",
  prompt:
    "Create a Netlify function at netlify/functions/data.ts mounted at /api/data that returns JSON of the current time, and make sure its responses carry `Cache-Control: no-store` and `X-Robots-Tag: noindex` headers.",
  judge: [
    { check: "File is located under netlify/functions/ with an exported config setting path: '/api/data'" },
    {
      check:
        "Sets BOTH headers on the returned `Response` in code — via the `Response` init `headers` object (e.g. `new Response(body, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })`) or `response.headers.set(...)`.",
    },
    {
      check:
        "Does NOT add these headers via a `[[headers]]` block in netlify.toml — `[[headers]]` only applies to static files served from Netlify's CDN, not to function responses.",
    },
    {
      check:
        "Does NOT add these headers via a `_headers` file or a `[[redirects]]` header rule either — dynamic response headers belong in the function code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
