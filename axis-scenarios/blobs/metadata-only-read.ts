import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: read metadata without downloading the blob",
  prompt:
    "We store uploaded files in a Netlify Blobs store, and at upload time we attach metadata (contentType, size, uploadedAt) to each blob. Create a Netlify function at /api/files/:key/info that returns just that metadata for a given key — the content type and when it was uploaded — WITHOUT downloading the file's bytes.",
  judge: [
    { check: "Reads the metadata via `store.getMetadata(key)` — which returns metadata WITHOUT downloading the blob data" },
    { check: "Does NOT use `store.get(key)` or `store.getWithMetadata(key)` to fetch the metadata, since those download the blob contents (the whole point is to avoid the data transfer)" },
    { check: "Returns the metadata fields (contentType, uploadedAt, etc.) as the response — not the file bytes" },
    { check: "Imports `getStore` from '@netlify/blobs' and reads the key via context.params.key" },
    { check: "Uses the modern Netlify function signature with config.path: '/api/files/:key/info'" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
