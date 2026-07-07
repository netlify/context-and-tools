import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Single-use / replay tracking for presigned uploads (or any cross-request
// state) cannot live in module-level memory: each invocation may hit a
// different or cold-started function instance, so an in-memory Set silently
// lets replays through in production. State must live in a durable store
// (Netlify Blobs or a database). Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: in-memory single-use tracking lets replayed uploads through in production",
  prompt:
    "My MCP server has a presigned-upload flow. To stop the signed PUT URL from being replayed, my upload function keeps a module-level `const usedTokens = new Set<string>()` and rejects a token that's already in the set. It works when I test locally, but in production the same signed URL sometimes succeeds twice. Why, and how should I enforce single-use properly?",
  judge: [
    {
      check:
        "Identifies the root cause: the `Set` lives in module-level memory, which is per-instance and not durable -- Netlify runs the function on multiple instances (and cold-starts fresh ones), so a replay that lands on a different instance never sees the token, and the set is wiped on cold start",
    },
    {
      check:
        "Explains why it passed locally / in testing but fails in production: a single warm instance shares that memory, so the guard only appears to work until real traffic spreads across instances",
    },
    {
      check:
        "Correct fix: persist the single-use / replay state in a DURABLE store -- Netlify Blobs or the database -- keyed by the upload id/token, and check-and-mark it there (e.g. status `pending -> uploaded -> finalized`) instead of an in-memory Set",
    },
    {
      check:
        "Does NOT try to fix it by pinning the function to a single instance, using sticky sessions, a stateful/session transport, or a shared in-process cache -- the fix is external durable state, keeping the function stateless",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
