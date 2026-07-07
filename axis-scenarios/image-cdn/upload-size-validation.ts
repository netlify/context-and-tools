import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: server-side file size validation on uploads",
  prompt:
    "I'm building an image upload endpoint as a Netlify Function at POST /api/upload that stores the uploaded image in a Netlify Blobs store. My React upload form already checks the selected file's size in the browser and refuses to send anything larger than 4 MB, so users can't upload huge files. Write the upload Function. Read the image from the multipart form data, store it in Blobs, and return `{ key }` as JSON.",
  judge: [
    { check: "The upload Function validates the uploaded file's size on the server and rejects files that exceed a maximum with an error response (e.g. HTTP 400) — it does not simply store whatever it receives" },
    { check: "Does NOT rely on the browser's size check alone — the server re-validates size because client-side validation can be bypassed" },
    { check: "Stores the uploaded image in a Netlify Blobs store via `getStore(...)` + `store.set(key, ...)` from '@netlify/blobs'" },
    { check: "Uses the modern Netlify Function handler signature with a `config` export declaring the route `path` (e.g. `/api/upload`)" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
