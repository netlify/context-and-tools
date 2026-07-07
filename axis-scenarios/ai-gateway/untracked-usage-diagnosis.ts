import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Distinct from the "API key missing" error: here the calls SUCCEED but the
// usage never shows up because a user-set provider key has shadowed Netlify's
// auto-injection, routing calls straight to the provider and bypassing the
// gateway. The skill maps this exact symptom ("calls succeed but aren't
// tracked") to a user-set `*_API_KEY`.
export default {
  name: "AI Gateway: calls succeed but usage isn't tracked",
  prompt:
    "My Netlify function calls OpenAI through the AI Gateway with `new OpenAI()` and the responses come back fine — but the usage never shows up in my Netlify AI usage/credits, like the calls aren't going through the gateway at all. What would cause that, and how do I fix it?",
  judge: [
    {
      check:
        "Diagnoses that a user-set provider key (`OPENAI_API_KEY`) shadows Netlify's auto-injection and routes the calls directly to the provider, bypassing the gateway — which is why the usage isn't tracked, even though the calls succeed.",
    },
    {
      check:
        "Tells the user to check for and remove/unset their own `OPENAI_API_KEY` (and not set any `*_API_KEY`) so the gateway's auto-injected placeholder key and base URL take over again.",
    },
    {
      check:
        "Confirms the correct wiring is bare `new OpenAI()` with no `apiKey`/`baseURL` argument — the gateway auto-injects the credentials — so the fix is removing the shadowing key, not adding constructor config.",
    },
    {
      check:
        "Does NOT recommend keeping or rotating the user's own provider key, nor manually pointing a custom `baseURL` at the gateway — a user-set key is the cause, not part of the fix.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
