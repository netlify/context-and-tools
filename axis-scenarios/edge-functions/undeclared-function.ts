import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Edge Functions: diagnose an edge function that never runs (no path binding)",
  prompt:
    "This site has an edge function at netlify/edge-functions/auth.ts that should return a 401 for any request to /admin without a `session` cookie. But when I deploy and visit /admin, the request goes straight through — the function never runs and there's no error in the logs anywhere. Figure out why it isn't running and fix it so the function actually gates /admin.",
  setup: copyFixture("edge-auth-site"),
  judge: [
    { check: "Diagnoses the root cause: auth.ts is not bound to any path — it has no inline `export const config` with a `path`, and netlify.toml has no matching `[[edge_functions]]` entry — so nothing routes a request to it and it is never invoked" },
    { check: "Explains that an edge function file with no path declaration produces no build error or warning; it deploys but silently never runs" },
    { check: "Fixes it by binding the function to the admin path — EITHER adding an inline `export const config` with `path: '/admin/*'` (or '/admin') to auth.ts, OR adding an `[[edge_functions]]` entry to netlify.toml with `path = '/admin/*'` (or '/admin') and `function = 'auth'`" },
    { check: "Does NOT invent an unrelated cause (e.g. claiming the handler logic, the cookie check, the Deno runtime, or the file location is broken) — the existing code runs correctly once it is wired to a path" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
