import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: text-to-image generation",
  prompt:
    "Create a Netlify function at netlify/functions/generate-image.ts mounted at /api/generate-image that accepts POST { prompt: string } and returns a generated PNG image. Use Netlify's AI Gateway.",
  judge: [
    { check: "Uses the `@google/genai` package — image generation on the gateway is Gemini-only" },
    { check: "Does NOT use `@google/generative-ai` (older deprecated package) and does NOT attempt OpenAI image models like dall-e or gpt-image" },
    { check: "Uses a Gemini image model (e.g. 'gemini-2.5-flash-image' or 'gemini-3-pro-image')" },
    { check: "Does NOT pass a custom apiKey or baseURL to the GoogleGenAI client — the gateway auto-configures it" },
    { check: "Does NOT read or set `GEMINI_API_KEY` / `GOOGLE_API_KEY` — those disable the gateway" },
    { check: "Extracts the image bytes from `response.candidates[0].content.parts[*].inlineData` (base64 string) rather than expecting a URL" },
    { check: "Returns the image with a correct Content-Type (e.g. image/png) — either streamed/binary in the Response, or a JSON payload that includes the mimeType alongside the base64 data" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
