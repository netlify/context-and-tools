import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: seed a store at build time via the deploy directory",
  prompt:
    "At build time I generate a set of prerendered product JSON files (1.json, 2.json, ...) that I want available in Netlify Blobs the moment the site goes live — without a runtime function looping over them and calling store.set during a cold start. Each file also has a little metadata (a content type and a generatedAt timestamp). What's the build-time way to get these into Blobs, and how do I read them back?",
  judge: [
    { check: "Uses the build-time file-based upload path: write the generated files into the `.netlify/blobs/deploy/` directory during the build, where the path under that directory becomes the blob key — rather than calling `store.set` for each file at runtime" },
    { check: "Attaches per-file metadata via a JSON sidecar whose name is the blob's filename prefixed with `$` and ending in `.json` (e.g. metadata for `1.json` in `$1.json.json`)" },
    { check: "Reads the seeded blobs back at runtime with a DEPLOY-scoped store — `getDeployStore(...)`, NOT a site-scoped `getStore()` — since build-time uploads live in the deploy-scoped store" },
    { check: "Imports the store helper from '@netlify/blobs' and uses documented methods" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
