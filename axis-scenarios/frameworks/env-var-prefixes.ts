import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Shared by the base judge (inherited by no-context) and the strict with-skill
// judge, so the wording can't drift between them. The strict variant adds the
// one check that loading the skill should produce (Netlify.env.get in the function).
const baseChecks = [
  { check: "Gives the client-exposed value the `VITE_` prefix (e.g. `VITE_API_BASE_URL`) — the prefix Vite requires to expose a var to client code" },
  { check: "Reads the client var in React via `import.meta.env.VITE_API_BASE_URL`" },
  { check: "Does NOT give `STRIPE_SECRET_KEY` a `VITE_` prefix and does NOT reference it in any client-side code — that is what would leak it into the browser bundle" },
  { check: "Does NOT hardcode the secret value in netlify.toml or in source — it is set as a Netlify environment variable (UI/CLI)" },
];

export default {
  name: "Frameworks: client-exposed vs server-only env vars in a Vite app",
  prompt:
    "I have a Vite + React app deployed on Netlify with a Netlify Function. I need an API base URL available in my React components, and a STRIPE_SECRET_KEY that only my Netlify Function can read — it must never reach the browser bundle. Set up both env vars correctly and show how each is accessed.",
  judge: baseChecks,
  variants: withSkillVariantsStrict([
    ...baseChecks,
    { check: "Reads the secret inside the Netlify Function with `Netlify.env.get('STRIPE_SECRET_KEY')`, not `process.env.STRIPE_SECRET_KEY`" },
  ]),
} satisfies ScenarioInput;
