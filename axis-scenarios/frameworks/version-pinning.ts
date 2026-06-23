import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Frameworks: don't guess package versions when pinning",
  prompt:
    "Scaffold a new React + Vite app set up to deploy on Netlify with the @netlify/vite-plugin. List the package.json dependencies and the install commands — I want the exact versions to use.",
  judge: [
    { check: "Does NOT hard-pin guessed/specific version numbers (e.g. writing `\"@netlify/vite-plugin\": \"^1.2.3\"` or a specific `vite`/`@vitejs/plugin-react` version) that it cannot verify is current" },
    { check: "EITHER instructs checking the current version first via `npm view <pkg> version` (or installs with `@latest`), OR installs without explicit version pins (e.g. `npm install @netlify/vite-plugin vite @vitejs/plugin-react`) so package.json picks up whatever npm resolves as current" },
    { check: "If it explains the reasoning, it notes that a model's knowledge cutoff lags npm so a guessed pin tends to fail or install something incompatible — passes vacuously if it simply avoids pins without explaining" },
    { check: "Installs the correct Netlify integration: `@netlify/vite-plugin` (registered in vite.config) — not a wrong-target adapter or a hand-rolled Netlify Function shim" },
    { check: "Does NOT fabricate a version that looks authoritative (e.g. a precise `x.y.z`) and present it as the known-good current release" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
