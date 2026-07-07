import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Under-tested rule: a function runs in exactly one region; you can't deploy the
// same function to multiple regions. For geo-routing, route between distinct
// functions with an edge function. Grounded in netlify-functions/SKILL.md
// (Region: "A function runs in exactly one region. Don't try to deploy the same
// function to multiple regions — if the user wants geo-routing, route between
// distinct functions with an edge function instead.").
export default {
  name: "Functions: single-region constraint for geo-routing",
  prompt:
    "I want netlify/functions/api.ts to run close to users in both the US and Europe. Can I set config.region to an array like ['cmh', 'dub'] so the same function deploys to both regions and each request is served from the nearest one? If not, what should I do instead?",
  judge: [
    {
      check:
        "States that a Netlify function runs in exactly one region — the same function cannot be deployed to multiple regions, so a multi-region array for config.region is not a supported way to geo-route one function.",
    },
    {
      check:
        "Recommends the grounded alternative for geo-routing: use an edge function to route between distinct functions, rather than trying to deploy one function to several regions.",
    },
    {
      check:
        "Does NOT present a multi-region config (e.g. region set to an array of airport codes) as a working setting that deploys one function to multiple regions.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
