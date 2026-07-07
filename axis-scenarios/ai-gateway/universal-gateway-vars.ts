import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Besides the per-provider vars, Netlify injects a provider-agnostic pair —
// `NETLIFY_AI_GATEWAY_BASE_URL` and `NETLIFY_AI_GATEWAY_KEY` — for callers that
// need an explicit endpoint + key (e.g. a raw `fetch`, not a provider SDK).
// Both are auto-injected at runtime when AI is enabled.
export default {
  name: "AI Gateway: provider-agnostic NETLIFY_AI_GATEWAY_* env vars",
  prompt:
    "Create a Netlify function at netlify/functions/gateway-raw.ts mounted at /api/gateway-raw that calls the AI Gateway with a plain `fetch` request instead of one of the provider SDKs. I'd rather point it at Netlify's provider-agnostic gateway env vars than the per-provider OPENAI_/ANTHROPIC_ ones — which vars do I use, and how do I wire them in?",
  judge: [
    {
      check:
        "Identifies `NETLIFY_AI_GATEWAY_BASE_URL` as the provider-agnostic gateway endpoint / base URL to send the `fetch` request to.",
    },
    {
      check:
        "Identifies `NETLIFY_AI_GATEWAY_KEY` as the provider-agnostic gateway key used to authenticate the request (e.g. as the API key / Authorization value).",
    },
    {
      check:
        "Explains both `NETLIFY_AI_GATEWAY_*` vars are auto-injected by Netlify at runtime when AI is enabled — the user does not set them by hand.",
    },
    {
      check:
        "Reads the vars via `Netlify.env.get(...)` (not `process.env`) and does NOT hardcode the gateway URL or set a real provider API key.",
    },
    {
      check:
        "Uses the modern Netlify function signature (default export async handler, Web API Request/Response) with a config exporting path: '/api/gateway-raw'.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
