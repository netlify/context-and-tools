import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: environment variables",
  prompt:
    "Create a Netlify function at netlify/functions/proxy.ts mounted at /api/proxy that reads an UPSTREAM_API_KEY environment variable, forwards a GET request to https://example.com/data with the key as a Bearer token, and returns the upstream response body.",
  judge: [
    { check: "Reads the API key via Netlify.env.get('UPSTREAM_API_KEY') — NOT process.env.UPSTREAM_API_KEY" },
    { check: "Does not hardcode any API key value in the source" },
    { check: "Uses default export async handler that accepts a Web API Request as its first parameter and returns a Response. The second context parameter may be omitted if unused." },
    { check: "Exports a config with path: '/api/proxy'" },
    { check: "Forwards the request to https://example.com/data using fetch with an Authorization: Bearer <key> header" },
    { check: "Returns the upstream response (or its body) as the function's Response" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
