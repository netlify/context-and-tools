import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: scope to specific HTTP methods",
  prompt:
    "Create a Netlify edge function on `/api/*` that should only ever be invoked for GET and POST requests. For any other method, the edge function should not run at all (let the request continue normally). Configure the method scoping at the platform level rather than checking the method inside the function body.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    { check: "Sets config.method to an array including 'GET' and 'POST' (e.g. method: ['GET', 'POST']) so the platform only invokes the function for those methods" },
    { check: "Config scopes the function to '/api/*' (path)" },
    { check: "Does NOT gate the methods solely with an `if (req.method !== ...)` branch inside the handler body — the prompt asks for platform-level method scoping via config.method" },
    { check: "Uses the modern edge-function default-export (req, context) signature, importing Config/Context types from @netlify/edge-functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
