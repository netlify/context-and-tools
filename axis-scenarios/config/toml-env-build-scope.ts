import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: netlify.toml env vars are build-scoped, not runtime",
  prompt:
    "I have a Netlify Function that reads `API_BASE_URL` (value `https://api.example.com`) at runtime via `Netlify.env.get('API_BASE_URL')`. I was planning to add it under `[build.environment]` in netlify.toml. Will the function actually be able to read it at runtime? Set it up so it works.",
  judge: [
    { check: "States that variables declared in netlify.toml (`[build.environment]` or `[context.*.environment]`) are build-scoped and are NOT injected into the Functions/Edge Functions runtime — so `Netlify.env.get('API_BASE_URL')` would return undefined if the value is only set there" },
    { check: "Directs the user to provide `API_BASE_URL` as a runtime environment variable via the Netlify UI or `netlify env:set` (available to both builds and function runtime), rather than relying on netlify.toml" },
    { check: "Does NOT claim that adding `API_BASE_URL` under `[build.environment]` in netlify.toml will make it readable inside the function at runtime" },
    { check: "Does NOT invent a netlify.toml section that supposedly exposes build env vars to functions — the fix is a runtime env var set outside netlify.toml (UI/CLI/API)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
