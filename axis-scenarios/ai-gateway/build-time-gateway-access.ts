import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "AI Gateway: build-time AI calls have no gateway credentials",
  prompt:
    "I want to use the Netlify AI Gateway to generate an SEO summary for each of my ~500 marketing pages and bake the text into the static HTML at build time (in my static-site-generation step, so there's no per-request AI cost). Set this up with the OpenAI SDK through the gateway.",
  judge: [
    { check: "Warns that AI Gateway credentials are injected only at RUNTIME (deployed functions, edge functions, server routes at request time) and are NOT available during the build — so calling the gateway from a build/SSG step gets no credentials and fails" },
    { check: "Redirects the work to runtime: generate the summaries in a function/server route at request time (optionally caching results, e.g. to Netlify Blobs) rather than at build time — or clearly states the build-time approach can't use the gateway at all" },
    { check: "If it writes gateway code, constructs the provider SDK bare (e.g. `new OpenAI()` with no baseURL/apiKey) relying on auto-injected env vars, and does NOT set its own OPENAI_API_KEY" },
    { check: "Mentions that gateway usage is credit-metered (draws down the Netlify AI allowance and pauses when the limit is hit) — relevant when fanning out across ~500 pages" },
    { check: "Does NOT claim the gateway will simply work inside the build/prerender step as written" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
