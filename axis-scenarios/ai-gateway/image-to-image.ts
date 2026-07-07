import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: image-to-image restyle via Gemini",
  prompt:
    "Create a Netlify function at netlify/functions/restyle.ts mounted at /api/restyle that accepts POST { image: string (base64 PNG), instruction: string }, applies the instruction to restyle the supplied image, and returns the edited image. Use Netlify's AI Gateway.",
  judge: [
    {
      check:
        "Uses the `@google/genai` package — image generation/editing on the gateway is Gemini-only. Does NOT use `@google/generative-ai` or OpenAI image models (dall-e / gpt-image).",
    },
    {
      check:
        "Passes the SOURCE image as an additional content part with `inlineData` (e.g. `{ inlineData: { mimeType: 'image/png', data: <base64> } }`) alongside the text instruction part — not as a URL and not text-only.",
    },
    {
      check:
        "Pins a Gemini IMAGE model (e.g. `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, or `gemini-3-pro-image`).",
    },
    {
      check:
        "Constructs the client as `new GoogleGenAI({})` with no `apiKey`/baseURL, and does NOT read or set `GEMINI_API_KEY` / `GOOGLE_API_KEY`.",
    },
    {
      check:
        "Extracts the edited image bytes from a response content part's `inlineData` (base64) — e.g. `response.candidates[0].content.parts[*].inlineData` — rather than expecting a URL.",
    },
    {
      check:
        "Uses `Netlify.env.get(...)` (not `process.env`) for any env access and the modern function signature with a config exporting path: '/api/restyle'.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
