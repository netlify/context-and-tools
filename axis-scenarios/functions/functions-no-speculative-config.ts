import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Restraint scenario: an ordinary endpoint should leave the defaults alone.
// Grounded in netlify-functions/SKILL.md — region defaults to `cmh` and must not
// be overridden without a stated reason; `memory`/`vcpu` must not be set
// speculatively (billing scales linearly with size).
export default {
  name: "Functions: leave region/memory defaults for an ordinary endpoint",
  prompt:
    "Create a Netlify function at netlify/functions/subscribe.ts mounted at /api/subscribe that accepts a POST with a JSON { email } body, checks the email is present, and returns 201 with JSON { ok: true } (or a 400 if email is missing). It's just a simple newsletter-subscribe endpoint.",
  judge: [
    { check: "File is located under netlify/functions/" },
    {
      check:
        "Uses a default export async handler that accepts a Web API Request and returns a Response, with an exported config setting path: '/api/subscribe'",
    },
    {
      check:
        "Reads the JSON body, treats a missing email as an error (e.g. 400) and returns a success response (e.g. 201 with { ok: true }) when present",
    },
    {
      check:
        "Does NOT set `config.region` — this ordinary endpoint has no stated region or data-residency reason, and functions already default to `cmh` (Ohio).",
    },
    {
      check:
        "Does NOT set `config.memory` or `config.vcpu` — this is a trivial I/O-bound endpoint, not a memory- or compute-intensive workload; raising the size only increases cost.",
    },
    {
      check:
        "Does NOT hallucinate any other unsupported Netlify config field.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
