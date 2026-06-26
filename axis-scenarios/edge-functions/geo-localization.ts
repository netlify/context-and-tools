import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: country-based redirect to localized path",
  prompt:
    "Create a Netlify edge function that runs on the root path `/` and redirects visitors based on their country: France → /fr, Germany → /de, Japan → /ja. Everyone else stays on /. Don't redirect requests that already include a locale prefix.",
  judge: [
    { check: "File lives under `netlify/edge-functions/`" },
    { check: "Reads the visitor country via `context.geo.country.code` (or equivalent `context.geo` field) — NOT by parsing a request header" },
    { check: "Returns a redirect (e.g. `Response.redirect(new URL('/fr', req.url))`) for visitors from the mapped countries; uses an appropriate status (302 / 307 / 308)" },
    { check: "Config scopes the function to the root via `path: '/'` (the prompt says it runs on /, not all paths)" },
    { check: "Returns `undefined` or `context.next()` for unmatched countries so the request continues to the default page" },
    { check: "Does NOT hardcode the country code from a Netlify.env variable or process.env — it must be derived from each request's geo" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
