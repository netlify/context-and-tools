import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: multiple paths, excludedPath, and preferStatic",
  prompt:
    "Create a Netlify function at netlify/functions/docs.ts that serves documentation. It must respond on BOTH `/api/docs` and `/api/docs/:slug`. Two constraints: (1) there are prebuilt static HTML files deployed under those same paths that must keep being served as static files — the function should not shadow them; (2) the route `/api/docs/internal` must never reach this function.",
  judge: [
    { check: "Uses default export async handler with the (req: Request, context: Context) signature" },
    { check: "config.path is an ARRAY including both '/api/docs' and '/api/docs/:slug' (not a single path)" },
    { check: "Sets preferStatic: true in config so existing static files are served instead of being overridden by the function" },
    { check: "Sets excludedPath to '/api/docs/internal' (string or array including it) so that route is excluded from the function" },
    { check: "Reads the slug via context.params.slug for the parameterized path — not by parsing req.url manually" },
    { check: "Does NOT implement the static-file or exclusion behavior with manual branching inside the handler body (e.g. checking the pathname and calling fetch) — these are config concerns" },
    { check: "Imports Config and/or Context types from @netlify/functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
