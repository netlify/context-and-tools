import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: list and delete with prefix",
  prompt:
    "We store user-uploaded files in a Netlify Blobs store keyed as `user-<id>/<filename>`. Create a Netlify function at /api/users/:id/files that returns GET (list all keys for that user) and DELETE (delete every blob for that user). Use Blobs' built-in listing — don't shell out or keep a side index.",
  judge: [
    { check: "Uses `store.list({ prefix: 'user-<id>/' })` to scope the listing — NOT scanning all blobs and filtering client-side" },
    { check: "Returns the list of keys (or `{ blobs: [...] }` shape) for GET, not the file contents" },
    { check: "DELETE iterates the listing and calls `store.delete(key)` for each key (or otherwise removes only the prefixed keys, never the whole store)" },
    { check: "Does NOT attempt to clear the entire store / drop the store as a way to delete one user's files" },
    { check: "Routes to both GET and DELETE on the same path (single function with method dispatch, or `config.method` declaring both)" },
    { check: "Reads `:id` via `context.params.id` — not by parsing the URL manually" },
    { check: "Imports `getStore` from '@netlify/blobs'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
