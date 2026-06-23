import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: access and scoping decisions before scaffolding uploads",
  prompt:
    "Set up Netlify Blobs so my app can store files that users upload and serve them back later. Get me started.",
  judge: [
    { check: "Before committing to an implementation, surfaces the access decision — EITHER asks whether the files should be publicly readable or private/authenticated, OR proceeds with the safe documented default (private, gated by server code) while explicitly stating that assumption and inviting correction. Fails only if it silently scaffolds public, unauthenticated access with no mention of the choice." },
    { check: "Uses a site-scoped store via `getStore(...)` for the user-uploaded data — NOT a deploy-scoped `getDeployStore(...)`, which would discard the data on the next deploy" },
    { check: "Reflects that Netlify Blobs has NO built-in access control — the serving/function layer is the gate — e.g. it reads blobs back through a function rather than assuming a blob has a public, unauthenticated URL of its own" },
    { check: "Imports `getStore` from '@netlify/blobs' (not from another package)" },
    { check: "Does NOT default uploads to world-readable access without calling out that decision to the user" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
