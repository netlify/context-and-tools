import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: SPA rewrites and API proxy in netlify.toml",
  prompt:
    "Create a netlify.toml for a single-page app that ships from the `dist` directory. Client-side routes (e.g. /pricing, /docs/anything) must be served by index.html so the SPA router can take over. Requests to /api/* should be proxied to https://api.example.com/* without changing the URL in the browser. Keep the configuration minimal.",
  judge: [
    { check: "Sets `[build]` with `publish = 'dist'` (or equivalent), matching the project's build output" },
    { check: "Adds an SPA fallback redirect: `from = '/*'`, `to = '/index.html'`, `status = 200` (a 200 rewrite, not a 301/302 redirect)" },
    { check: "Adds an API proxy redirect: `from = '/api/*'`, `to = 'https://api.example.com/:splat'`, `status = 200`" },
    { check: "The API proxy rule appears BEFORE the SPA catch-all — Netlify applies the first matching rule, so the order matters" },
    { check: "Does NOT add `force = true` to the SPA fallback unless needed — by default it only fires when no static file matches, which is what an SPA wants" },
    { check: "Does NOT include any secrets / API keys inline in netlify.toml" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
