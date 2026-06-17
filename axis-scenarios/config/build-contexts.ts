import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: deploy context overrides",
  prompt:
    "Update netlify.toml so the production build runs `npm run build` and points `API_BASE_URL` at https://api.example.com, while deploy previews run `npm run build:preview` and point `API_BASE_URL` at https://staging.api.example.com. Both should publish from `dist`.",
  judge: [
    { check: "Defines a base `[build]` section with `publish = 'dist'` (and optionally a default `command`)" },
    { check: "Adds a `[context.production]` block that sets the production build command and environment via `[context.production.environment]` with `API_BASE_URL = 'https://api.example.com'`" },
    { check: "Adds a `[context.deploy-preview]` block that sets the preview build command and `[context.deploy-preview.environment]` with `API_BASE_URL = 'https://staging.api.example.com'`" },
    { check: "Context-specific environment overrides go under `[context.<name>.environment]`, NOT under a top-level `[build.environment]` block (that one wouldn't differentiate by context)" },
    { check: "Does NOT hardcode a secret API key in netlify.toml — only the public base URL is configured here" },
    { check: "Uses the exact context names `production` and `deploy-preview` — not 'preview', 'prod', or branch-deploy" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
