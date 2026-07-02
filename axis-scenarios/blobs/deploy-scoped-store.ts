import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: deploy-scoped store for per-deploy build artifacts",
  prompt:
    "During each Netlify build I generate artifacts that belong to that specific deploy — a prebuilt search index and some prerendered HTML fragments. They should be tied to the deploy's lifecycle: when the deploy is replaced by a newer one, these artifacts should go away with it, not linger. Use Netlify Blobs to store and read them.",
  judge: [
    { check: "Uses a DEPLOY-scoped store via `getDeployStore(...)` — NOT a site-scoped `getStore(...)`, because the artifacts should live and die with the deploy" },
    { check: "Imports `getDeployStore` from '@netlify/blobs'" },
    { check: "Uses only the documented store methods (set / setJSON / get / list / delete) — does not invent other methods" },
    { check: "Reflects that a deploy-scoped store is tied to a single deploy and is discarded when that deploy is replaced (this is the intended behavior here, not a bug to work around)" },
    { check: "Does NOT reach for Netlify Database for these per-deploy file artifacts — they are build-output assets, a fit for Blobs" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
