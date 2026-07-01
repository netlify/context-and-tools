import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: bypass to origin on error",
  prompt:
    "Create a Netlify edge function on `/*` that personalizes the response (it reads the visitor's country from context.geo and sets an `x-geo-country` header on the downstream response). Important: if this edge function ever throws, the request must fall through to the original origin/static content instead of showing an error — visitors should never get a broken page because of this function.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    { check: "Configures error handling via config.onError: 'bypass' so a thrown error passes the request through to the origin — NOT only a manual try/catch around the body" },
    { check: "Calls await context.next() to obtain the downstream response and sets the x-geo-country header on it, then returns it" },
    { check: "Reads the country from context.geo (e.g. context.geo.country.code) — not from a request header" },
    { check: "Config scopes the function to '/*' (path)" },
    { check: "Does NOT use process.env or Deno.env; if any env var is read, uses Netlify.env.get()" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
