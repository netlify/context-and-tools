import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: same URL must return an identical Netlify-Vary header",
  prompt:
    "Create a Netlify function at netlify/functions/offers.ts mounted at /api/offers that returns personalized offers cached on Netlify's CDN, keyed on the visitor's `plan` cookie. In my first draft I only add the `Netlify-Vary: cookie=plan` header on the code path where the `plan` cookie is present; when it's missing I return a generic offer with no Netlify-Vary header at all. Is that OK, or do I need to set the vary header every time?",
  judge: [
    { check: "Explains that the same URL must return an identical `Netlify-Vary` header across all of its responses — so the vary header cannot be set on only some code paths / only when the cookie is present" },
    { check: "Corrects the draft so `/api/offers` emits the SAME `Netlify-Vary: cookie=plan` header on every response, including the cookie-missing / generic path — not conditionally" },
    { check: "Uses the documented `Netlify-Vary: cookie=<name>` syntax keyed on the specific `plan` cookie name (not a bare `Vary: Cookie` or the entire raw Cookie header)" },
    { check: "Keeps a CDN cache header (`Netlify-CDN-Cache-Control` or `CDN-Cache-Control`) with a non-zero s-maxage so the response is actually cached at the edge" },
    { check: "Uses the modern Netlify function signature with `config.path: '/api/offers'`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
