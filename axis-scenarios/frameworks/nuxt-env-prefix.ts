import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Client env vars use a per-framework prefix beyond Vite's `VITE_`. For Nuxt the
// client prefix is `NUXT_PUBLIC_`, accessed via `useRuntimeConfig().public`.
// Grounded in netlify-frameworks/SKILL.md ("Environment Variables in Frameworks").
export default {
  name: "Frameworks: client-exposed vs server-only env vars in a Nuxt app",
  prompt:
    "I have a Nuxt 3 app deployed on Netlify. I need a public API base URL available in my Vue components in the browser, plus a private DB password that only server-side code should ever see. How should I name and access each so the public one reaches the client but the secret never does?",
  judge: [
    {
      check:
        "Gives the client-exposed value the `NUXT_PUBLIC_` prefix — the prefix Nuxt uses to expose an env var to client-side code.",
    },
    {
      check:
        "Accesses the public value in components via `useRuntimeConfig().public` (e.g. `useRuntimeConfig().public.apiBaseUrl`).",
    },
    {
      check:
        "Does NOT give the private DB password a `NUXT_PUBLIC_` prefix and does NOT reference it in client-side code — a client prefix is exactly what would expose it to the browser.",
    },
    {
      check:
        "Does NOT hardcode the DB password in source or committed config — it is provided as a Netlify environment variable.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
