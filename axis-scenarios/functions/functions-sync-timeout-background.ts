import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Under-tested rule: synchronous functions have a 60-second timeout, so
// long-running work should proactively use a background function (up to 15
// minutes, immediate 202, results stored externally). Grounded in
// netlify-functions/SKILL.md Resource Limits ("Synchronous timeout | 60
// seconds") and Background Functions ("For long-running tasks (up to 15
// minutes). The client receives an immediate `202` response; return values are
// ignored." / "Store results externally (Netlify Blobs, database)...").
const shared = [
  { check: "File is located under netlify/functions/" },
  {
    check:
      "Uses a modern default export async handler (not exports.handler or a named handler export)",
  },
];

export default {
  name: "Functions: long-running work exceeds the 60s sync ceiling",
  prompt:
    "Create a Netlify function at netlify/functions/generate-report.ts that builds a large PDF export. Generating the report typically takes about two minutes to finish.",
  // Baseline (no-context): a plain synchronous function OR a background function
  // is acceptable; the baseline is not required to recognize the 60s ceiling.
  judge: [
    ...shared,
    {
      check:
        "Produces a working function that performs the report generation and does not fabricate an unsupported Netlify config option.",
    },
  ],
  // with-skill: expect recognition of the 60s synchronous ceiling and a switch
  // to a background function.
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "Imports Config (and optionally Context) types from @netlify/functions",
    },
    {
      check:
        "Recognizes that a synchronous Netlify function has a 60-second timeout, which the ~2-minute report generation would exceed.",
    },
    {
      check:
        "Uses a background function for the long-running work by setting background: true in the exported config (background functions allow up to 15 minutes).",
    },
    {
      check:
        "Does not rely on returning the finished report in the HTTP response (a background function returns 202 immediately and its return value is ignored); instead persists the result externally (e.g. Netlify Blobs or a database) for later retrieval rather than returning it to the caller.",
    },
  ]),
} satisfies ScenarioInput;
