import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: choose serverless for a CPU-heavy task",
  prompt:
    "I want an endpoint at `/process` on Netlify that takes an uploaded image, resizes it with a heavy image-processing npm library, and runs a few seconds of CPU-bound work per request. I was going to build it as a Netlify edge function so it's fast and close to users. Is that the right primitive? Set it up the right way.",
  judge: [
    { check: "Recommends a Netlify serverless function, NOT an edge function, for this workload" },
    { check: "Justifies the choice with the relevant edge limitations — e.g. the per-request CPU budget (~50 ms), the 512 MB memory ceiling, and the Deno runtime being a poor fit for heavy/long CPU-bound work or complex Node-native image libraries" },
    { check: "If it scaffolds any code, the handler is a serverless function under netlify/functions/ — NOT under netlify/edge-functions/" },
    { check: "Does NOT place the CPU-heavy resizing work in an edge function just because low latency was requested" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
