import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: route errors to a custom error page",
  prompt:
    "Create a Netlify edge function on `/app/*` that personalizes the response by setting an `x-variant` header on the downstream response. Requirement: if this edge function ever throws, the visitor should be sent to our custom static error page at `/oops` — not the raw origin content and not a generic platform error. Configure the error handling accordingly.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    {
      check:
        "Sets `config.onError` to the custom error-page path `/oops` so a thrown error routes the visitor to that page — NOT `\"bypass\"` and NOT the default `\"fail\"`",
    },
    {
      check:
        "Calls `await context.next()` to obtain the downstream response and sets the `x-variant` header on it before returning",
    },
    { check: "Config scopes the function to '/app/*' (path)" },
    {
      check:
        "Uses the modern edge-function default-export (req, context) signature with Config/Context types from @netlify/edge-functions",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
