import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: auth gate on /admin/*",
  prompt:
    "Create a Netlify edge function that protects /admin/* routes. If the incoming request doesn't have a `session` cookie, redirect to /login. If it does, let the request through to the original page unchanged.",
  judge: [
    { check: "File lives under `netlify/edge-functions/` — NOT `netlify/functions/`" },
    { check: "Exports a `config` object with `path: '/admin/*'` (or array including it)" },
    { check: "Reads the `session` cookie by parsing the request's cookie header (`req.headers.get('cookie')`), or via an equivalent cookie API — and uses the result to branch" },
    { check: "Returns `Response.redirect(new URL('/login', req.url))` (or equivalent) when the session cookie is absent" },
    { check: "Lets authorized requests through, either by calling `context.next()` and returning its result, or by returning `undefined` to pass through unchanged" },
    { check: "Does NOT use `process.env` — uses `Netlify.env.get(...)` if any env var is read" },
    { check: "Does NOT import Node-only built-ins without the `node:` specifier (edge functions run on Deno; e.g. `node:crypto` is OK, bare `crypto` from npm is not)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
