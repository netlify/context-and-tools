import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: troubleshoot 'API key missing' at runtime",
  prompt:
    "My Netlify function uses the OpenAI SDK through the AI Gateway, but at runtime it throws `OpenAI: OPENAI_API_KEY missing`. I'm using `new OpenAI()` with no key on purpose. What's wrong and how do I fix it?",
  judge: [
    {
      check:
        "Enumerates BOTH documented causes of the missing-key error: (1) AI Features are not enabled on the site in the Netlify UI, and (2) the site has not had a production deploy yet (the gateway only activates after the first production deploy).",
    },
    {
      check:
        "Does NOT tell the user to fix it by setting their own `OPENAI_API_KEY` — setting a provider key shadows Netlify's auto-injection and bypasses/disables the gateway.",
    },
    {
      check:
        "Confirms the user's bare `new OpenAI()` construction is correct (the placeholder key and base URL are auto-injected) — the problem is the gateway not being active, not the missing constructor argument.",
    },
    {
      check:
        "Does NOT attempt to diagnose or fix this by curling `https://api.netlify.com/...`, running `netlify api <method>`, or reading tokens from `~/Library/Preferences/netlify/config.json`.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
