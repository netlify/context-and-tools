import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

// Adapter-vs-hand-authored scenario: in a Next.js app, a new API endpoint is an
// App Router Route Handler, not a raw netlify/functions file. Grounded in
// netlify-frameworks/references/nextjs.md (API routes deploy as Netlify Functions
// automatically) and netlify-functions/SKILL.md "Framework Considerations" (do not
// write raw Netlify Functions when the framework adapter handles routing).
export default {
  name: "Frameworks: add a Next.js API endpoint as a Route Handler",
  prompt:
    "Add an API endpoint to this Next.js blog at /api/subscribe that accepts a POST with a JSON { email } body: validate that email is present — return a 400 if it's missing, and JSON { ok: true } otherwise. Wire it up the idiomatic way for this app.",
  judge: [
    {
      check:
        "Creates an App Router Route Handler at `app/api/subscribe/route.ts` exporting an async `POST` handler that reads `await request.json()` and returns JSON (e.g. `Response.json(...)` or `NextResponse.json(...)`).",
    },
    {
      check:
        "Does NOT create a raw `netlify/functions/*` file to back the endpoint — the Netlify Next.js runtime deploys Route Handlers as functions automatically.",
    },
    {
      check:
        "Does NOT add a `[[redirects]]`/rewrite or any netlify.toml entry to route `/api/subscribe` — App Router handles the routing.",
    },
    {
      check:
        "Validates that `email` is present before treating the request as successful (e.g. returns a 400 when it is missing).",
    },
    {
      check:
        "Does NOT hardcode any secret — reads it from an env var (`process.env` is valid and idiomatic in a Next.js Route Handler); passes vacuously if no env vars are introduced.",
    },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
