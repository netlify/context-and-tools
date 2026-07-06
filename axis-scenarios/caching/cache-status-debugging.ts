import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: how to verify a response came from the CDN cache",
  prompt:
    "I've added CDN cache headers to one of my Netlify function responses. How can I verify, for a given request, whether the response was actually served from Netlify's CDN cache or generated fresh? What exactly should I look at?",
  judge: [
    { check: "Points to the `Cache-Status` response header as the way to tell whether a response was served from cache, generated fresh, or revalidated" },
    { check: "Does NOT invent a different or non-existent header name (e.g. a made-up `X-Netlify-Cache` or `X-Cache`) as the canonical signal for this on Netlify" },
    { check: "Suggests a concrete way to inspect the response headers (e.g. `curl -I` against the URL, or the browser devtools Network panel)" },
    { check: "Does NOT instruct the user to call the Netlify API directly or read internal logs to determine cache state — the answer is in the response header" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
