import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// The gateway only activates after a site's first PRODUCTION deploy, and AI must
// be enabled in the UI. A skill-loaded agent should surface this proactively
// rather than letting the user discover it via a runtime "API key missing"
// error. Baseline still has to build correct bare-SDK gateway code; the strict
// (with-skill) run additionally demands the proactive first-deploy warning.
const shared = [
  {
    check:
      "Constructs the provider SDK bare — e.g. `new OpenAI()` / `new Anthropic()` / `new GoogleGenAI({})` — with NO custom `baseURL` and NO `apiKey` argument, relying on the gateway's auto-injected env vars.",
  },
  {
    check:
      "Does NOT read or set any provider key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) — setting one disables gateway routing.",
  },
  {
    check:
      "Pins a model from the gateway's curated list (e.g. an OpenAI `gpt-4o*` / `gpt-5*` chat model) rather than an arbitrary or unsupported model id.",
  },
];

export default {
  name: "AI Gateway: warn that a production deploy is required first",
  prompt:
    "I just created a brand-new Netlify site and want to add an AI chat endpoint using the AI Gateway so I don't manage API keys. Set it up and tell me what I need to do to get it working.",
  // Baseline (no-context): build correct gateway code. It can't be expected to
  // know the first-deploy activation rule, so that's only in the strict judge.
  judge: shared,
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "Proactively warns that the AI Gateway only activates AFTER the site has had at least one PRODUCTION deploy — a brand-new project won't have gateway access (calls will error) until it is deployed to production once.",
    },
    {
      check:
        "Tells the user they must ENABLE AI on the site in the Netlify UI as part of setup.",
    },
    {
      check:
        "Does NOT claim the gateway will work in local dev (`netlify dev`) on this brand-new project before that first production deploy.",
    },
  ]),
} satisfies ScenarioInput;
