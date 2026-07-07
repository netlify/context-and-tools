import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: Netlify Functions run on AWS Lambda, which caps the combined size of
// all environment variables at ~4 KB. A single large value (a service-account
// JSON, a PEM key) can exceed it and break the deploy/runtime. Grounded in
// netlify-functions/SKILL.md (Environment Variables -> total size budget).
export default {
  name: "Functions: a large value does not belong in an environment variable",
  prompt:
    "My Netlify function needs a Google service-account credential — the full JSON file is about 12 KB. My plan is to paste the entire JSON into a single environment variable named GCP_CREDENTIALS and read it with Netlify.env.get in the function. Will that work on Netlify?",
  judge: [
    {
      check:
        "Warns that Netlify Functions run on AWS Lambda, which caps the combined size of all environment variables at roughly 4 KB, so a ~12 KB value stuffed into one variable will exceed that limit and break the deploy or the function at runtime.",
    },
    {
      check:
        "Recommends keeping the large payload OUT of environment variables — e.g. bundle it as a file the function reads (via included_files or a module import), store it in Netlify Blobs, or fetch it at runtime — and reserving env vars for small secrets/config.",
    },
    {
      check:
        "Does NOT claim the full 12 KB JSON will fit fine in one environment variable, and does NOT invent a Netlify setting that raises the environment-variable size cap.",
    },
    {
      check:
        "Does NOT suggest hardcoding the credential in source; any env access it shows uses Netlify.env.get() rather than process.env.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
