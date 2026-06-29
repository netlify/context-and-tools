import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: Gemini chat completion",
  prompt:
    "Create a Netlify function at netlify/functions/ask.ts mounted at /api/ask that accepts POST { prompt: string } and returns Gemini's text answer. Use Google's Gemini via Netlify's AI Gateway so I don't manage an API key.",
  judge: [
    {
      check:
        "Installs and imports the `@google/genai` package (the unified Google GenAI SDK) — NOT the deprecated `@google/generative-ai`, which does not pick up the gateway env vars.",
    },
    {
      check:
        "Constructs the client as `new GoogleGenAI({})` with NO `apiKey` and NO custom base URL — the gateway auto-injects `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL`.",
    },
    {
      check:
        "Does NOT read or set `GEMINI_API_KEY` or `GOOGLE_API_KEY` — setting one disables gateway routing.",
    },
    {
      check:
        "Calls `ai.models.generateContent` with a Gemini CHAT model from the curated list (e.g. `gemini-2.5-flash`, `gemini-2.5-pro`) — NOT an image model like `gemini-2.5-flash-image`.",
    },
    {
      check:
        "Reads the answer from `response.text` (the documented accessor) rather than hand-walking an OpenAI-shaped `choices[0].message.content`.",
    },
    {
      check:
        "Awaits `req.json()` for the prompt, uses `Netlify.env.get(...)` (not `process.env`) for any env access, and uses the modern function signature with a config exporting path: '/api/ask'.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
