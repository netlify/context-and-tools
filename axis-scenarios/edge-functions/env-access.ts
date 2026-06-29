import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: read an environment variable",
  prompt:
    "Create a Netlify edge function on `/feature` that reads a feature-flag secret named `FEATURE_FLAGS` from the environment, parses it, and returns whether the `beta` flag is enabled as JSON. Read the env var the correct way for a Netlify edge function.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    { check: "Reads the env var via Netlify.env.get('FEATURE_FLAGS') — the documented way to read environment variables in an edge function" },
    { check: "Does NOT use Deno.env.get(...) and does NOT use process.env to read the variable" },
    { check: "Actually uses the value it read (parses it and derives the `beta` flag) — it is a real env read, not a placeholder" },
    { check: "Config scopes the function to '/feature' (path)" },
    { check: "Uses the modern edge-function default-export (req, context) signature with Config/Context types from @netlify/edge-functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
