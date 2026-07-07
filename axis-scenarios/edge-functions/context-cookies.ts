import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: A/B bucket cookie via context.cookies",
  prompt:
    "Create a Netlify edge function for my homepage (path `/`) that runs a simple A/B test. Read a `bucket` cookie from the incoming request. If it's missing, randomly assign 'a' or 'b', store it as a cookie on the response so it sticks for future visits, then continue to the origin. If the cookie is already set, just pass the request through unchanged. Use Netlify's edge cookie helpers rather than hand-parsing the Cookie header or building Set-Cookie strings yourself.",
  judge: [
    { check: "File lives under netlify/edge-functions/ with the modern default-export (req, context) signature and config.path scoped to '/'" },
    { check: "Reads the existing cookie with `context.cookies.get('bucket')` — NOT by manually parsing `req.headers.get('cookie')`" },
    { check: "When the cookie is missing, assigns 'a' or 'b' and persists it with `context.cookies.set(...)` (e.g. `context.cookies.set({ name: 'bucket', value })`) — NOT by manually constructing a `Set-Cookie` header" },
    { check: "Continues to origin with `await context.next()` and returns that response (or returns undefined to pass through) so the assigned cookie is applied to the outgoing response" },
    { check: "Does NOT use process.env or Deno.env; if any env var is read, uses Netlify.env.get()" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
