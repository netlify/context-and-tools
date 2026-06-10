import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: streaming response",
  prompt:
    "Create a Netlify function at netlify/functions/stream.ts mounted at /api/stream that streams server-sent events. Emit one SSE message per second for five seconds, then close the stream.",
  judge: [
    { check: "Uses default export async handler that accepts a Web API Request as its first parameter and returns a Response. The second context parameter may be omitted if unused." },
    { check: "Returns a Response whose body is a ReadableStream (not a string or Buffer)" },
    { check: "Sets Content-Type header to text/event-stream on the Response" },
    { check: "Exports a config with path: '/api/stream'" },
    { check: "Closes the stream after the five messages are emitted (calls controller.close())" },
    { check: "Imports Config and/or Context types from @netlify/functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
