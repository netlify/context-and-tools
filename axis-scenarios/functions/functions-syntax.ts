import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: modern handler syntax",
  prompt:
    "Create a Netlify function at netlify/functions/server-time.ts that responds to GET /api/server-time and returns the current server time as JSON.",
  judge: [
    { check: "Uses default export async handler — not exports.handler or a named handler export" },
    { check: "Handler's first parameter is a Web API Request (not a legacy event/handler object) and the handler returns a Response. The second context parameter may be omitted if unused." },
    { check: "Imports Config and/or Context types from @netlify/functions" },
    { check: "Exports a config object with path: '/api/server-time'" },
    { check: "File is placed at netlify/functions/server-time.ts (or .mts)" },
    { check: "Does not use process.env; if env vars are referenced at all, uses Netlify.env.get()" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
