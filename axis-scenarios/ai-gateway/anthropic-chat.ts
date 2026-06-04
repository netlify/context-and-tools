import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: Anthropic chat completion",
  prompt:
    "Create a Netlify function at netlify/functions/summarize.ts mounted at /api/summarize that accepts POST { text: string } and returns a one-paragraph summary from Claude. Use the @anthropic-ai/sdk package and route through Netlify's AI Gateway.",
  judge: [
    { check: "Installs and imports the `@anthropic-ai/sdk` package (not openai, not @google/genai, not raw fetch)" },
    { check: "Passes `baseURL: Netlify.env.get('ANTHROPIC_BASE_URL')` to the Anthropic client constructor — the SDK does not auto-discover this env var" },
    { check: "Does NOT read or set `ANTHROPIC_API_KEY` — the gateway injects a placeholder key automatically" },
    { check: "Uses `Netlify.env.get(...)` for any env var access, not `process.env`" },
    { check: "Calls `client.messages.create` with a Claude model from the gateway's curated list (e.g. 'claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5')" },
    { check: "Reads the input text via `await req.json()` and includes it in the user message content" },
    { check: "Uses the modern Netlify function signature with a config exporting path: '/api/summarize'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
