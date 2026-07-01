import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: enable manual response caching",
  prompt:
    "Create a Netlify edge function at netlify/edge-functions/promo.ts on path `/promo` that returns a small generated HTML snippet. I want to opt this edge function into Netlify's response caching mode so its output can be cached. Set the appropriate config flag.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    { check: "Sets config.cache: 'manual' to opt the edge function into caching" },
    { check: "Config scopes the function to '/promo' (path)" },
    { check: "Uses the modern edge-function default-export (req, context) signature returning a Response, importing Config/Context types from @netlify/edge-functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
