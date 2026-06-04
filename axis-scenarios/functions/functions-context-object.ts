import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: context object usage",
  prompt:
    "Create a Netlify function at netlify/functions/whoami.ts mounted at /api/whoami. It should return JSON containing the visitor's country code and city from context.geo, the request id from context.requestId, and a session cookie value read via context.cookies.get('session'). If no session cookie exists, set one with context.cookies.set({ name: 'session', value: <a new uuid or random string> }).",
  judge: [
    { check: "Uses default export async handler with (req: Request, context: Context) signature" },
    { check: "Exports a config with path: '/api/whoami'" },
    { check: "Reads geo data via context.geo (e.g. context.geo.country.code, context.geo.city)" },
    { check: "Reads context.requestId and includes it in the JSON response" },
    { check: "Reads the session cookie via context.cookies.get('session') — NOT by parsing the Cookie header manually" },
    { check: "When no session cookie exists, sets one via context.cookies.set({ name: 'session', value: ... })" },
    { check: "Imports Config and Context types from @netlify/functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
