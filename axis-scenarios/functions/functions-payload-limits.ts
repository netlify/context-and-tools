import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: large upload exceeds the buffered payload limit",
  prompt:
    "I want a Netlify function at /api/upload that accepts user video uploads up to ~50 MB. My plan is to read the whole request body into a Buffer in the function and then store it. Will that work on Netlify, and if not, what should I do instead?",
  judge: [
    { check: "Surfaces the relevant payload limit: a buffered request body in a Netlify function is capped at 6 MB, so reading a ~50 MB upload fully into memory will NOT work" },
    { check: "Recommends a workable alternative rather than buffering the whole file — e.g. streaming the body (streamed payloads go up to 20 MB) and/or uploading directly to external/object storage (such as a presigned upload or direct-to-Blobs flow) so the large file does not pass buffered through the function" },
    { check: "Does NOT claim that simply raising function memory/vcpu, or a plain buffered handler, lets it accept arbitrarily large (50 MB) uploads — the limit is a request payload limit, not a memory limit" },
    { check: "Does NOT invent a Netlify config option that lifts the payload limit to 50 MB" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
