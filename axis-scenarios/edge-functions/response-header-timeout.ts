import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: long-running work exceeds the 40s response-header timeout",
  prompt:
    "I want a Netlify edge function on `/report` that fans out to several slow partner APIs and can take roughly 60-90 seconds to assemble the full response before returning it. Is an edge function the right primitive for this? Set it up the correct way.",
  judge: [
    {
      check:
        "Recognizes that edge functions have a 40-second response-header timeout, so a request that takes ~60-90s to respond exceeds it and cannot be served by an edge function",
    },
    {
      check:
        "Recommends a Netlify serverless function for this long-running operation instead of an edge function (serverless supports long-running operations)",
    },
    {
      check:
        "If it scaffolds a handler, the code lives under netlify/functions/ (serverless) — NOT under netlify/edge-functions/",
    },
    {
      check:
        "Does NOT implement the 60-90s operation as an edge function despite the low-latency appeal",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
