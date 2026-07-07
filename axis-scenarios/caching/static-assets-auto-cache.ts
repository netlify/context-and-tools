import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: static assets are cached automatically, no config needed",
  prompt:
    "I'm deploying a Vite single-page app to Netlify. Do I need to add cache headers or a netlify.toml rule to get my built static assets (the JS/CSS/images in the build output) cached on the CDN, or does Netlify handle that? Explain what happens by default.",
  judge: [
    { check: "Explains that Netlify caches static assets automatically with no configuration needed — the agent does NOT tell the user they must hand-write cache headers or a netlify.toml rule just to get ordinary static build output cached" },
    { check: "States the CDN default: static assets are cached at the CDN for a long time (about 1 year) and automatically invalidated on every deploy, so a new deploy serves the fresh files" },
    { check: "Notes the browser default: browsers always revalidate (e.g. `max-age=0, must-revalidate`) so users pick up updated files after a deploy" },
    { check: "Clarifies that it's dynamic responses (Netlify Functions / edge functions / proxied responses) that are NOT cached by default and are where explicit cache headers are needed — not static assets" },
    { check: "Does NOT claim that a manual netlify.toml `[[headers]]` block for the whole build output is REQUIRED for basic static-asset caching to work" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
