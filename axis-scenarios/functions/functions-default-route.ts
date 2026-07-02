import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: rely on the default function route",
  prompt:
    "Create a simple Netlify function at netlify/functions/health.ts that returns JSON { ok: true }. I'm going to call it at its default Netlify function URL — I don't want a custom route for it.",
  judge: [
    { check: "Uses default export async handler that returns a Response (modern syntax, not exports.handler)" },
    { check: "File is placed at netlify/functions/health.ts (or .mts)" },
    { check: "Does NOT set a config.path — the function should rely on the built-in /.netlify/functions/health route. A redundant `path: '/.netlify/functions/health'` (or any custom path) that just duplicates the default is wrong here." },
    { check: "If the function's URL is mentioned anywhere, it is /.netlify/functions/health (not an invented /api/... route)" },
    { check: "Response body is JSON { ok: true }" },
    { check: "Does not use process.env; if any env var is referenced, uses Netlify.env.get()" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
