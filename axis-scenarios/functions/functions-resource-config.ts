import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Per-function memory/vCPU configuration is Netlify-specific knowledge. The
// baseline isn't expected to know the exact config field — it just must not
// invent a broken one — while the with-skill run should set it correctly.
const shared = [
  { check: "File is located under netlify/functions/" },
  {
    check:
      "Uses a default export async handler that accepts a Web API Request and returns a Response",
  },
  { check: "Exports a config with path: '/api/render-pdf'" },
];

export default {
  name: "Functions: per-function resource configuration",
  prompt:
    "Create a Netlify function at netlify/functions/render-pdf.ts mounted at /api/render-pdf that renders a large PDF — it is CPU- and memory-intensive and needs roughly 2 GB of memory, more than the default. Configure the function so it gets that memory.",
  // Baseline (no-context): producing a correct function is enough. If it
  // attempts to configure resources, it must not hallucinate an unsupported
  // Netlify config field or value that would fail deployment.
  judge: [
    ...shared,
    {
      check:
        "Does not invent a non-existent Netlify resource config (e.g. a bogus `ram`, `size`, or `cpu` field) or an unsupported value that would break deployment. Producing a correct function without any memory configuration is acceptable here.",
    },
  ],
  // with-skill: expect the real `memory`/`vcpu` config, set to a valid value in
  // range, and not both at once.
  variants: withSkillVariantsStrict([
    ...shared,
    // Typed imports are the skill's TS idiom — a with-skill expectation, not a
    // baseline requirement (a valid plain-JS function shouldn't fail the
    // lenient baseline, so this is not in `shared`).
    { check: "Imports Config and/or Context types from @netlify/functions" },
    {
      check:
        "Sets `memory` in the exported config to approximately 2 GB using a valid form — a number in MB (e.g. 2048) or a string with unit (e.g. '2gb' / '2048mb', case-insensitive) — within the allowed 1024–4096 MB range.",
    },
    {
      check:
        "Does NOT set both `memory` and `vcpu` — they are mutually exclusive.",
    },
  ]),
} satisfies ScenarioInput;
