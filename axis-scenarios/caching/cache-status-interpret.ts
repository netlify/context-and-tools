import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: interpret a Cache-Status response header",
  prompt:
    "A request to my Netlify site came back with this response header:\n\n`Cache-Status: \"Netlify Edge\"; fwd=miss, \"Netlify Durable\"; hit; ttl=3600`\n\nWas this response served from a cache or generated fresh, and what does each part mean?",
  judge: [
    { check: "Reads the header as RFC 9211 format — a comma-separated list where each quoted name (`\"Netlify Edge\"`, `\"Netlify Durable\"`) is a distinct named cache layer the request passed through, NOT a single bare HIT/MISS value" },
    { check: "Identifies that the `\"Netlify Durable\"` layer reports `hit`, so the response WAS served from the durable cache rather than generated fresh at the origin" },
    { check: "Explains `\"Netlify Edge\"; fwd=miss` means the edge layer did not hold the entry and forwarded the request onward (to the durable layer)" },
    { check: "Explains `ttl=3600` is the remaining freshness lifetime of the cached entry, in seconds" },
    { check: "Does NOT claim Netlify reports cache state via a different/invented header (e.g. `X-Cache`, `X-Netlify-Cache`) or as a bare `HIT`/`MISS`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
