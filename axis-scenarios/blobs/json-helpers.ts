import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: JSON helpers for a config snapshot",
  prompt:
    "At the end of each build we produce a single site-configuration snapshot — one JSON object with feature flags and theme settings — and we want to stash it in Netlify Blobs and read it back as a typed object at runtime. Use Netlify Blobs' JSON convenience helpers for the write and read.",
  judge: [
    { check: "Writes the snapshot with `store.setJSON(key, obj)` rather than manually `JSON.stringify`-ing into `store.set`" },
    { check: "Reads it back as parsed JSON via `store.get(key, { type: 'json' })` — NOT a manual `JSON.parse(await store.get(key))`" },
    { check: "Imports a store constructor from '@netlify/blobs' — either `getStore` or `getDeployStore` (deploy-scoped is a fine choice for a per-build snapshot)" },
    { check: "Treats this as a single stored JSON asset/snapshot — does NOT model it as a queryable record store or build per-record CRUD over Blobs as if it were a database (for relational/queryable data the right tool is Netlify Database)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
