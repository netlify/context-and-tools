import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: custom functions directory and node bundler",
  prompt:
    "Update netlify.toml so my serverless functions live in `src/server/functions` instead of the default location, and so they are bundled with esbuild.",
  judge: [
    { check: "Adds a `[functions]` block with `directory = 'src/server/functions'`" },
    { check: "Sets `node_bundler = 'esbuild'` inside the `[functions]` block" },
    { check: "Does NOT leave the directory at the default `netlify/functions` — the user explicitly wants a custom path" },
    { check: "Uses the single-table `[functions]` form for these global settings — not a `[[functions]]` array-of-tables entry (no such construct exists in netlify.toml; per-function overrides use a `[functions.\"name-or-glob\"]` table)" },
    { check: "Does NOT invent unrelated keys (e.g. a made-up `bundler`/`runtime` field) — only `directory` and `node_bundler` are needed" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
