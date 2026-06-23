import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: OpenAI chat completion",
  prompt:
    "Create a Netlify function at netlify/functions/chat.ts mounted at /api/chat that accepts POST { messages: { role, content }[] } and returns the assistant's reply text. Use OpenAI's gpt-4o via the OpenAI Node SDK and route through Netlify's AI Gateway so we don't manage an API key.",
  judge: [
    { check: "Installs and imports the `openai` SDK (not a raw fetch implementation, not @anthropic-ai/sdk or @google/genai)" },
    { check: "Constructs the OpenAI client with NO custom `baseURL` and NO `apiKey` argument — relies on the AI Gateway's auto-injected `OPENAI_BASE_URL` and placeholder key" },
    { check: "Does NOT read or set `OPENAI_API_KEY` anywhere — setting it disables the gateway" },
    { check: "Calls `client.chat.completions.create` with a model from the gateway's curated list (e.g. 'gpt-4o', 'gpt-4o-mini', 'gpt-5-mini')" },
    { check: "Awaits `req.json()` to read the messages array from the POST body" },
    { check: "Returns the assistant's reply as JSON in the function's Response" },
    { check: "Uses the modern Netlify function signature (default export async handler, Web API Request/Response) with a config exporting path: '/api/chat'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
