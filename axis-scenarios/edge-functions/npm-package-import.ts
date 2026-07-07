import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: use an npm package by name",
  prompt:
    "Create a Netlify edge function on `/slug` that reads a `?text=` query parameter, slugifies it using the `slugify` npm package, and returns the resulting slug as plain text. Add the dependency the right way for a Netlify edge function.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    {
      check:
        "Adds `slugify` as an npm dependency (installed via npm / listed in package.json)",
    },
    {
      check:
        "Imports the package by its bare name (e.g. `import slugify from \"slugify\"`) — NOT via a raw URL import and NOT through a Deno import map (import maps are for URL imports, not npm packages)",
    },
    {
      check:
        "Actually uses the package to slugify the `text` query param and returns the result",
    },
    {
      check:
        "Uses the modern edge-function default-export (req, context) signature with config.path set to '/slug'",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
