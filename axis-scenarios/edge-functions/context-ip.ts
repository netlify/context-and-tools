import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: read the visitor IP address",
  prompt:
    'Create a Netlify edge function on `/whoami` that returns the visitor\'s IP address as JSON (e.g. `{ "ip": "..." }`). Read the IP the correct way for a Netlify edge function.',
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    {
      check:
        "Reads the visitor IP via `context.ip` — the documented edge-function way — NOT by parsing an `X-Forwarded-For`/`X-Real-IP` or other request header",
    },
    {
      check:
        "Returns the value it read as JSON (a real read of context.ip, not a hardcoded placeholder)",
    },
    { check: "Config scopes the function to '/whoami' (path)" },
    {
      check:
        "Uses the modern edge-function default-export (req, context) signature with Config/Context types from @netlify/edge-functions",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
