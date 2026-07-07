import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: why CDN caching doesn't work under netlify dev",
  prompt:
    "I added `Netlify-CDN-Cache-Control: public, s-maxage=3600` to a Netlify function response and I'm testing it locally with `netlify dev`. Every request regenerates the response and I don't see a `Cache-Status` header at all. Is my caching config broken, and how should I actually verify it works?",
  judge: [
    { check: "Explains that `netlify dev` does not emulate the Netlify CDN cache — cache headers pass through but nothing is stored in or served from cache locally, and the `Cache-Status` header is absent, so a 'miss every time' on localhost is expected, not a bug" },
    { check: "Does NOT conclude the user's cache configuration is broken, nor tell them to change/fix the cache headers to make caching appear to work locally" },
    { check: "Directs the user to verify caching on a DEPLOYED URL (a Deploy Preview or the production site), not on localhost, and to inspect the `Cache-Status` response header there" },
    { check: "Does NOT invent a `netlify dev` flag or config option that enables real CDN caching locally" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
