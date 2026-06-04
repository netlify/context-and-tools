import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: background function",
  prompt:
    "Create a Netlify background function that processes a long-running report job. It should accept a POST with a JSON body { jobId: string } and run work that may take several minutes. Place it under netlify/functions/.",
  judge: [
    { check: "Filename ends with the -background suffix (e.g. process-report-background.ts)" },
    { check: "File is located under netlify/functions/" },
    { check: "Uses default export async handler with (req: Request, context: Context) signature" },
    { check: "Awaits req.json() to read the jobId from the request body" },
    { check: "Imports Config and/or Context types from @netlify/functions" },
    { check: "Does not rely on the function's return value being delivered to the client (background functions return 202 immediately and the response body is ignored)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
