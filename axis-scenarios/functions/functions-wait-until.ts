import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: persist work after responding with context.waitUntil",
  prompt:
    "Create a Netlify function at netlify/functions/track.ts mounted at /api/track. It should return a 204 to the caller immediately, then record an analytics event by POSTing it to an external collector (a slow ~500ms fetch). The response to the user must NOT wait for that collector call to finish, but the collector call must still be allowed to complete.",
  judge: [
    { check: "Uses default export async handler with the (req: Request, context: Context) signature" },
    { check: "Exports a config with path: '/api/track'" },
    { check: "Returns the 204 Response to the caller WITHOUT awaiting the collector fetch first — the response is not blocked on the slow call" },
    { check: "Hands the collector promise to context.waitUntil(...) so the platform keeps the function alive until it settles — does NOT just fire-and-forget the promise with no waitUntil (which risks the work being killed after the response)" },
    { check: "Does NOT `await` the collector fetch before returning the response (which would defeat the immediate-204 requirement)" },
    { check: "Does not use process.env; if the collector URL/key comes from env it uses Netlify.env.get()" },
    { check: "Imports Config and/or Context types from @netlify/functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
