import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: file upload and retrieval",
  prompt:
    "Create two Netlify functions that work together as a tiny file host. POST /api/files accepts a multipart upload, stores the file in Netlify Blobs under a generated key, and returns { key }. GET /api/files/:key streams the file back with its original content type.",
  judge: [
    { check: "Imports `getStore` from '@netlify/blobs' (not from '@netlify/database' or any other package)" },
    { check: "Calls `getStore({ name: '...' })` (or `getStore('name')`) — does NOT pass a siteID/token manually" },
    { check: "Upload handler stores the file via `store.set(key, data, { metadata: { ... } })` and persists at least the content type in metadata" },
    { check: "Read handler retrieves the binary payload via `store.get(key, { type: 'stream' })` or `'blob'` / `'arrayBuffer'` — NOT the default string type" },
    { check: "Read handler returns the stored Content-Type on the Response (read from metadata via `getWithMetadata` or stored separately)" },
    { check: "Generates the key on the server (UUID, hash, or timestamped name) rather than trusting the client's filename verbatim" },
    { check: "Both functions use the modern Netlify handler signature with `config.path` declaring the route" },
    { check: "Does NOT use Netlify Blobs to store user records / relational data — Blobs is for files/assets only (passes vacuously if the agent stays within file storage)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
