import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: method routing",
  prompt:
    "Create a Netlify function at netlify/functions/items.ts mounted at /api/items/:id that handles GET (return the item id), POST (echo the parsed JSON body), and DELETE (return 204). Any other method should return 405.",
  judge: [
    { check: "Uses default export async handler with (req: Request, context: Context) signature" },
    { check: "Exports a config with path: '/api/items/:id'" },
    { check: "If config.method is declared, it includes at least 'GET', 'POST', and 'DELETE'. This field is optional — handler-level dispatch on req.method is also valid, in which case this check passes vacuously." },
    { check: "Switches on req.method to dispatch GET / POST / DELETE branches" },
    { check: "POST branch awaits req.json() to parse the body" },
    { check: "Default branch (or unmatched method) returns a Response with status 405" },
    { check: "GET branch reads the id from context.params.id" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
