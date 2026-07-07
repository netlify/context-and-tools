import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: attempting to CDN-cache a POST response",
  prompt:
    "We have a Netlify function at /api/search that takes a POST body of search filters and returns JSON. It's expensive to compute and the same filters get requested a lot, so I want Netlify's CDN to cache these POST responses. Add the cache headers to make that happen.",
  judge: [
    { check: "Surfaces that Netlify's CDN only caches GET requests — a POST response is never cached at the CDN no matter what cache-control headers are set, so simply adding cache headers to the POST handler will not cache anything" },
    { check: "Does NOT silently add `Netlify-CDN-Cache-Control` to the POST handler and imply the responses will now be served from the CDN cache" },
    { check: "Proposes exposing the cacheable data over a GET request (e.g. moving the filters into the URL / query params so it becomes a GET route) so the response can be CDN-cached, or otherwise makes clear the request must be a GET to be cacheable" },
    { check: "Does NOT invent a Netlify config flag or header that makes the CDN cache non-GET methods" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
