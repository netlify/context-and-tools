import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: accept a file from the agent via presigned upload, not base64",
  prompt:
    "One of my MCP tools needs to accept an image the agent provides, store it, and let other tools reference it later. How should the upload work?",
  judge: [
    { check: "Does NOT push the file bytes through the tool call as base64 — calls out that base64 in a tool argument bloats the model context, is slow, and hits payload limits" },
    { check: "Uses a PRESIGNED-URL flow: a `prepare_upload` tool returns a short-lived, single-use signed URL (plus a handle) the agent PUTs raw bytes to, and a `finalize_upload` tool returns a stable key that other tools reference" },
    { check: "Stores the bytes in Netlify Blobs (written by a separate function that handles the PUT), keeping large binaries out of the JSON-RPC channel" },
    { check: "Signs the upload URL with an HMAC (e.g. HMAC-SHA256 over id / content-type / size / expiry using a secret env var) and verifies it in CONSTANT TIME on the PUT — the signature itself is the authorization, so the PUT needs no bearer token" },
    { check: "Guards the PUT endpoint: rejects a `Content-Type` or body size that doesn't match what `prepare_upload` declared, and enforces single-use so the signed URL can't be replayed" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
