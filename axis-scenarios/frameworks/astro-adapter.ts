import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Frameworks: configure Astro for Netlify SSR",
  prompt:
    "I have an Astro project that's currently configured for static output. I want to deploy it to Netlify with server-side rendering so I can add API routes and dynamic pages. Update astro.config.mjs and tell me what to install. Also add an API route at src/pages/api/hello.ts that returns JSON.",
  judge: [
    { check: "Installs the `@astrojs/netlify` adapter (the official Netlify adapter for Astro)" },
    { check: "Imports `netlify` from '@astrojs/netlify' in astro.config.mjs and registers it via `adapter: netlify()`" },
    { check: "Sets `output: 'server'` in astro.config.mjs — defaults to `'static'`, which prerenders every route unless a route opts out with `export const prerender = false`" },
    { check: "Does NOT install a Vercel, Cloudflare, or Node adapter — wrong target" },
    { check: "Does NOT write a raw Netlify Function under `netlify/functions/` for the API route — Astro's adapter generates the function at build time from `src/pages/api/`" },
    { check: "The API route exports an HTTP method handler (e.g. `export const GET`) using Astro's API route conventions and returns a Response" },
    { check: "Does NOT include `process.env.X` reads in the API route — uses `Netlify.env.get('X')` or `import.meta.env.X` where appropriate" },
  ],
  setup: copyFixture("astro-static"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
