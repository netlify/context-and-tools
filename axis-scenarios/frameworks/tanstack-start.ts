import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Frameworks: configure TanStack Start for Netlify",
  prompt:
    "I'm starting a new TanStack Start app and want to deploy it to Netlify with its server functions working. Tell me what to install and show me the config file I need. I'll be using server functions (createServerFn) for data loading.",
  judge: [
    { check: "Installs the Netlify TanStack Start plugin `@netlify/vite-plugin-tanstack-start`" },
    { check: "Registers the integration in `vite.config.ts` — the `plugins` array includes `tanstackStart()` and the Netlify plugin (e.g. `netlify()`) alongside the React plugin (`viteReact()`)" },
    { check: "Does NOT use the old `app.config.ts` + `defineConfig` from `@tanstack/react-start/config` shape — current TanStack Start configures through `vite.config.ts`" },
    { check: "Does NOT hand-author raw Netlify Functions under `netlify/functions/` for the server functions — `createServerFn` handlers are translated automatically by the plugin" },
    { check: "Does NOT pin guessed/fabricated version numbers for the plugin or TanStack packages — installs without explicit pins, with `@latest`, or after checking the current version" },
    { check: "Does NOT install a Vercel/Cloudflare/Node adapter or a wrong-target plugin" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
