import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Per-function region pinning via an airport-code `region` config is
// Netlify-specific. The baseline must not fabricate a region config; the
// with-skill run should use the correct airport code.
const shared = [
  { check: "File is located under netlify/functions/" },
  {
    check:
      "Uses a default export async handler that accepts a Web API Request and returns a Response",
  },
  { check: "Exports a config with path: '/api/eu/handler'" },
];

export default {
  name: "Functions: per-function region pinning",
  prompt:
    "Create a Netlify function at netlify/functions/eu-handler.ts mounted at /api/eu/handler that, for data-residency reasons, must run from a European region — specifically Dublin. Configure the function to deploy to that region.",
  // Baseline (no-context): may not know functions can be region-pinned. It must
  // not invent an unsupported config field/value presented as working; omitting
  // the region or noting it must be configured elsewhere is acceptable.
  judge: [
    ...shared,
    {
      check:
        "Does not hallucinate an unsupported Netlify region config (e.g. a bogus field, or a cloud-provider region string like 'eu-west-1') presented as a working setting. Omitting region configuration, or stating it must be set at the site/platform level, is acceptable here.",
    },
  ],
  // with-skill: expect `region` set to the Dublin airport code.
  variants: withSkillVariantsStrict([
    ...shared,
    // Typed imports are the skill's TS idiom — a with-skill expectation, not a
    // baseline requirement (a valid plain-JS function shouldn't fail the
    // lenient baseline, so this is not in `shared`).
    { check: "Imports Config and/or Context types from @netlify/functions" },
    {
      check:
        "Sets `region` in the exported config to the Dublin airport code 'dub'. Using a non-airport-code value such as 'eu-west-1', 'europe', or a full region name does NOT satisfy this check.",
    },
  ]),
} satisfies ScenarioInput;
