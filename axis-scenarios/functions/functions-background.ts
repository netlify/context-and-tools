import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Checks both variants must satisfy regardless of how background mode is
// enabled. The variant-specific check (filename suffix vs. config.background)
// is appended per variant below.
const shared = [
  { check: "File is located under netlify/functions/" },
  {
    check:
      "Uses a default export async handler whose first parameter is a Web API Request; the second context parameter may be omitted if unused (the skill's background example omits it)",
  },
  { check: "Awaits req.json() to read the jobId from the request body" },
  {
    check:
      "Does not rely on the function's return value being delivered to the client (background functions return 202 immediately and the response body is ignored)",
  },
];

export default {
  name: "Functions: background function",
  prompt:
    "Create a Netlify background function that processes a long-running report job. It should accept a POST with a JSON body { jobId: string } and run work that may take several minutes. Place it under netlify/functions/.",
  // Baseline (no-context): either documented mechanism is acceptable. The
  // legacy `-background` filename suffix and `config.background` both produce a
  // working background function, so the baseline is not penalized for picking
  // the older convention.
  judge: [
    ...shared,
    {
      check:
        "Enables background mode via EITHER the -background filename suffix (e.g. process-report-background.ts) OR background: true in the exported config — both are valid background mechanisms.",
    },
  ],
  // with-skill: hold the run to the recommended path. The skill states new
  // functions should use config.background, so the filename suffix alone is no
  // longer sufficient here.
  variants: withSkillVariantsStrict([
    ...shared,
    // Typed imports are the skill's TS idiom — a with-skill expectation, not a
    // baseline requirement (a valid plain-JS function shouldn't fail the
    // lenient baseline, so this is not in `shared`).
    { check: "Imports Config and/or Context types from @netlify/functions" },
    {
      check:
        "Enables background mode by setting background: true in the exported config object — this is the recommended form. Relying on the -background filename suffix alone (without config.background) does NOT satisfy this check.",
    },
  ]),
} satisfies ScenarioInput;
