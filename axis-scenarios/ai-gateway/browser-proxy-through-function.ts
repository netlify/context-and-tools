import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// There is no browser-callable gateway: credentials are runtime-only and only
// injected into server-side compute. Client code must proxy through a Netlify
// Function rather than calling a provider SDK (or exposing a key) in the browser.
export default {
  name: "AI Gateway: browser can't call the gateway — proxy through a function",
  prompt:
    "I'm building a React chat widget and I want it to call the AI Gateway directly from the browser with the OpenAI SDK so I don't have to run any backend. Wire it up.",
  judge: [
    {
      check:
        "Explains there is NO browser-callable gateway: gateway credentials are injected only into server-side runtime (functions / edge / server routes), the browser has no gateway credentials, and there is no public URL a browser can hit to reach the gateway directly.",
    },
    {
      check:
        "Redirects to the proxy pattern: put the gateway call in a Netlify Function (or edge / server route) and have the browser `fetch()` that endpoint (e.g. `/api/chat`), which talks to the gateway server-side and returns the result.",
    },
    {
      check:
        "Does NOT construct the OpenAI SDK or call the gateway in client-side browser code, and does NOT hardcode or otherwise expose a provider API key in the browser (which would leak it to every visitor and bypass the gateway).",
    },
    {
      check:
        "The proxy function it writes wires the gateway correctly: bare `new OpenAI()` with no `baseURL` / `apiKey`, does not set `OPENAI_API_KEY`, and pins a curated gateway model.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
