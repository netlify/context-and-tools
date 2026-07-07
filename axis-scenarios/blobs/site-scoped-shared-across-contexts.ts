import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: site-scoped store is shared across deploy contexts",
  prompt:
    "My app stores user-uploaded files in a Netlify Blobs site-scoped store via getStore({ name: 'uploads' }). I'm building a new feature on a deploy preview and I want to test writing and deleting blobs there — including clearing out old keys — without any risk to what's in production. Is my preview isolated from production for Blobs? Set up the test safely.",
  judge: [
    { check: "Corrects the assumption: a site-scoped `getStore()` store is SHARED across all deploy contexts — production, deploy previews, and branch deploys all read/write the same store, so a preview is NOT isolated from production data (unlike Netlify Database, which forks a branch per preview)" },
    { check: "Warns that running the destructive test (writes/deletes/clearing keys) against the site-scoped store from the preview would hit production data" },
    { check: "Recommends a real isolation strategy: use a deploy-scoped store (`getDeployStore()`), or a context-specific store `name`/key prefix for the throwaway test data — rather than testing against the production 'uploads' store" },
    { check: "Imports the store helper from '@netlify/blobs' and uses only documented store methods (get/set/setJSON/list/delete)" },
    { check: "Does NOT tell the user the preview is automatically sandboxed or forked from production for Blobs" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
