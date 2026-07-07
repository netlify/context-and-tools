import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// The gateway has documented, non-negotiable limits: a 200k-token context
// window, and no support for batch inference or custom request headers. A
// skill-aware agent should answer these capability questions from the skill's
// "Limits" line rather than assuming provider-native features pass through.
export default {
  name: "AI Gateway: documented limits (context window, batch, custom headers)",
  prompt:
    "I'm using the Netlify AI Gateway from a function. Before I build, confirm a few things will work through the gateway: (1) sending a single request with about 400k tokens of context, (2) attaching a custom `X-Trace-Id` request header to my provider calls, and (3) using the provider's batch inference API to process a queue of prompts cheaply. Will these work through the gateway?",
  judge: [
    {
      check:
        "States the AI Gateway has a 200k-token context window, so a single ~400k-token request exceeds that limit and won't work as-is.",
    },
    {
      check:
        "States that batch inference is NOT supported through the gateway.",
    },
    {
      check:
        "States that custom request headers are NOT supported through the gateway.",
    },
    {
      check:
        "Does NOT invent a config flag, header, or setting to 'enable' batch inference, custom headers, or a larger context window on the gateway — these are documented gateway limits, not toggles.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
