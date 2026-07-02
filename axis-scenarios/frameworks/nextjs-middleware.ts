import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Frameworks: Next.js middleware running at the edge on Netlify",
  prompt:
    "I'm deploying a Next.js App Router app to Netlify. I need middleware that checks for a session cookie and redirects unauthenticated visitors away from /dashboard/* to /login. It should run at the edge. Add it.",
  setup: copyFixture("nextjs-blog"),
  judge: [
    { check: "Creates a `middleware.ts` (or `.js`) file using Next.js middleware conventions — exports a `middleware` function that receives the request" },
    { check: "Uses `NextResponse` from 'next/server' (e.g. `NextResponse.redirect(...)` to /login and `NextResponse.next()` otherwise)" },
    { check: "Scopes the middleware to the dashboard routes via an exported `config.matcher` (or by checking the request pathname)" },
    { check: "Does NOT hand-author a file under `netlify/edge-functions/` — Netlify's Next.js runtime compiles `middleware.ts` into a Netlify Edge Function automatically" },
    { check: "Does NOT add an `[[edge_functions]]` entry in netlify.toml to wire up the middleware — the runtime handles that mapping" },
    { check: "Does NOT replace the middleware with a custom Netlify Function or an `app/.../route.ts` handler — Next middleware is the right primitive here" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
