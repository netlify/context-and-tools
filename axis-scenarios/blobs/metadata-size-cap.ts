import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: don't stuff large data into object metadata",
  prompt:
    "In my Netlify Blobs store each object is an uploaded document. I want to attach a lot of info to each one via the `metadata` option on `store.set` — the full extracted text of the document, a big list of tags, and a running change-history log — so I can read it all back with getMetadata without downloading the file. Wire this up.",
  judge: [
    { check: "Warns that Netlify Blobs object metadata is capped (roughly 2 KB per object) and is meant for small descriptors — content type, size, timestamps, a status flag — NOT large payloads like full extracted text or an unbounded change-history log" },
    { check: "Puts the large data (extracted text, tags, history) in the blob VALUE (or a separate blob), keeping the `metadata` object limited to small fields" },
    { check: "Still uses `store.getMetadata(key)` for the small metadata it retains, and reads the larger content from the blob value when it's actually needed" },
    { check: "Imports `getStore` from '@netlify/blobs' and uses documented methods (set/get/getMetadata/getWithMetadata)" },
    { check: "Does NOT claim metadata can hold arbitrarily large JSON, and does NOT try to raise or work around the metadata cap" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
