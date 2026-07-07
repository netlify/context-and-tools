import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// A stateless JSON MCP server only does request/response over POST. A GET makes
// the transport open an SSE stream that never closes, which a serverless
// function can't serve -- surfacing as a 502. The function must reject non-POST
// methods with 405. Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: a GET to a stateless MCP endpoint should return 405, not hang as SSE",
  prompt:
    "I deployed a stateless MCP server as a Netlify Function at /mcp. It works fine from Claude Code, but when I open the URL in my browser the request hangs and eventually returns a 502. Is my server broken? How should it handle that request?",
  judge: [
    {
      check:
        "Diagnoses the cause: the browser issues a plain GET, but the stateless JSON transport only handles request/response over POST -- a GET makes the transport try to open an SSE stream that never closes, which a serverless function can't serve, and that surfaces as the 502.",
    },
    {
      check:
        "Clarifies the server is not actually broken for real MCP clients (which POST) -- the 502 is expected behavior for a GET to a POST-only stateless endpoint, not an infrastructure/config bug to escalate.",
    },
    {
      check:
        "Recommends the function reject non-POST methods explicitly with HTTP 405 before handing the request to the transport, e.g. `if (req.method !== \"POST\") return new Response(\"Method not allowed\", { status: 405 })`.",
    },
    {
      check:
        "Does NOT recommend making the function serve a long-lived SSE stream (or switching to a stateful session transport) just to satisfy the browser GET.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
