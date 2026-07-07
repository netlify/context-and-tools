import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// A gateway call runs inside a function and is bound by the 60-second
// synchronous function timeout. A long-form generation can exceed it, so the
// skill-guided answer streams the response (or uses a background function)
// rather than blocking on a single synchronous, unstreamed completion.
export default {
  name: "AI Gateway: long generation must not exceed the function timeout",
  prompt:
    "Create a Netlify function at netlify/functions/article.ts mounted at /api/article that takes POST { topic: string } and generates a long-form (2000+ word) article with gpt-5 through the AI Gateway, then returns it. These generations regularly take well over a minute. Make sure it won't hit the function timeout.",
  judge: [
    {
      check:
        "Identifies that the gateway call runs inside the function and is bound by the 60-second synchronous function timeout, so a generation taking over a minute can exceed it.",
    },
    {
      check:
        "Mitigates the timeout the documented way — EITHER streams the response (enables streaming on the SDK call and returns a `ReadableStream` / `text/event-stream` so chunks flow to the client incrementally) OR uses a background function (returns 202 immediately, runs up to 15 minutes, and persists the result for the client to fetch).",
    },
    {
      check:
        "Does NOT leave the generation as a single blocking, unstreamed synchronous call that assumes a >1-minute completion will return within the timeout.",
    },
    {
      check:
        "Wires the gateway correctly: constructs the OpenAI SDK bare (no custom `baseURL`, no `apiKey`), does NOT set `OPENAI_API_KEY`, and pins a curated gateway model (e.g. a `gpt-5*` / `gpt-4o*` chat model).",
    },
    {
      check:
        "Uses the modern Netlify function signature (default export async handler, Web API Request/Response) with a config exporting path: '/api/article'.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
