import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: strong consistency for read-after-write",
  prompt:
    "Create a Netlify function at /api/draft that writes a document blob to Netlify Blobs and then, immediately afterward in the same request, reads that same key back to return the stored value to the caller. The read must reliably reflect the value just written — no eventual-consistency lag where it comes back null or stale. Configure the store correctly for this.",
  judge: [
    { check: "Creates the store with strong consistency — `getStore({ name: '...', consistency: 'strong' })` — so the immediate read-after-write reliably returns the just-written value" },
    { check: "Imports `getStore` from '@netlify/blobs'" },
    { check: "Writes with `store.set` (or setJSON) and reads back with `store.get` on the same key" },
    { check: "Does NOT add a sleep/retry loop, an external cache, or a re-fetch hack to paper over consistency — strong consistency is the documented mechanism for read-after-write here" },
    { check: "Uses the modern Netlify function signature with config.path: '/api/draft'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
