import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Frameworks: Vite + React project with Netlify primitives in dev",
  prompt:
    "I have a Vite + React app. I want `npm run dev` (the normal Vite dev command — not `netlify dev`) to give me access to Netlify Functions, Blobs, and env vars locally. Set this up and add a sample Netlify function at /api/ping that returns 'pong'.",
  judge: [
    { check: "Installs `@netlify/vite-plugin` as a dev dependency" },
    { check: "Registers the plugin in `vite.config.ts` (or .js/.mjs) — imported and added to the `plugins` array" },
    { check: "Does NOT instruct the user to run `netlify dev` as the primary dev command — the whole point of the plugin is that `npm run dev` (vite) is enough" },
    { check: "Function file lives under `netlify/functions/` (e.g. `netlify/functions/ping.ts`)" },
    { check: "Function uses the modern signature: default export async handler returning a Response, with `config.path: '/api/ping'`" },
    { check: "Function does NOT use `process.env` for env vars — uses `Netlify.env.get(...)` if any env var is referenced" },
    { check: "Does NOT add `@netlify/functions` framework-shim code or middleware in vite.config — the plugin handles the integration" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
