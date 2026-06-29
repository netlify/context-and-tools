import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// gpt-3.5-turbo is a real OpenAI model but is NOT on the gateway's curated
// supported list — pinning it makes the gateway return an HTTP error. A
// skill-aware agent should recognize this and substitute a supported model.
export default {
  name: "AI Gateway: handle a real-but-unsupported chat model",
  prompt:
    "Create a Netlify function that answers user questions using OpenAI's `gpt-3.5-turbo` model, routed through Netlify's AI Gateway.",
  judge: [
    {
      check:
        "Flags that `gpt-3.5-turbo` is NOT on the AI Gateway's curated list of supported models, and that pinning an unsupported model causes the gateway to return an HTTP error.",
    },
    {
      check:
        "Substitutes a supported OpenAI chat model from the gateway's curated list (e.g. `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`) instead of silently pinning `gpt-3.5-turbo`.",
    },
    {
      check:
        "Does NOT try to 'enable' the unsupported model via a config flag, header, or by switching to a direct (non-gateway) OpenAI call — the gateway exposes only a curated subset.",
    },
    {
      check:
        "Constructs the OpenAI client bare (`new OpenAI()`) with no `apiKey` or `baseURL`, and does NOT set `OPENAI_API_KEY`.",
    },
    {
      check:
        "Uses `Netlify.env.get(...)` for any env access (not `process.env`) and the modern Netlify function signature.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
