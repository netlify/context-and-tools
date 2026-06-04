import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: path parameters",
  prompt:
    "Create a Netlify function at netlify/functions/get-item.ts that handles GET /api/items/:id and returns JSON of the form { id: <the id from the URL> }.",
  judge: [
    { check: "Uses default export async handler with (req: Request, context: Context) signature" },
    { check: "Exports a config with path: '/api/items/:id' (string or array including this pattern)" },
    { check: "Reads the id via context.params.id — not by parsing req.url manually" },
    { check: "Returns a Response whose JSON body contains the id from context.params" },
    { check: "Imports Config and Context types from @netlify/functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
