import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Not every model family has an unversioned alias on the gateway. The gpt-5.3
// family, specifically, is exposed only as `gpt-5.3-chat-latest` and
// `gpt-5.3-codex` — there is NO bare `gpt-5.3`. A skill-aware agent should catch
// this when the user asks for the unversioned id and use a real alias instead.
export default {
  name: "AI Gateway: handle a model family with no unversioned alias",
  prompt:
    "Create a Netlify function at netlify/functions/reason.ts mounted at /api/reason that answers user questions using OpenAI's `gpt-5.3` model through the AI Gateway.",
  judge: [
    {
      check:
        "Flags that there is NO unversioned `gpt-5.3` on the gateway — the gpt-5.3 family is exposed only as `gpt-5.3-chat-latest` and `gpt-5.3-codex`, so a bare `gpt-5.3` id isn't valid.",
    },
    {
      check:
        "Pins a real gpt-5.3 alias from the curated list — `gpt-5.3-chat-latest` (the chat model) or `gpt-5.3-codex` — instead of the nonexistent bare `gpt-5.3`.",
    },
    {
      check:
        "Constructs the OpenAI client bare (`new OpenAI()`, no `apiKey`/`baseURL`) and does NOT read or set `OPENAI_API_KEY`.",
    },
    {
      check:
        "Uses `Netlify.env.get(...)` (not `process.env`) for any env access and the modern Netlify function signature with a config exporting path: '/api/reason'.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
