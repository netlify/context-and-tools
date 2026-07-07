import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// The Streamable HTTP transport returns HTTP 406 to any POST whose `Accept`
// header lacks BOTH `application/json` and `text/event-stream`. That's an
// MCP-spec requirement the CLIENT must satisfy -- a 406 means fix the client's
// Accept header, not the server. Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: POST returns 406 -- diagnose the client's Accept header",
  prompt:
    "I wrote a small script that POSTs JSON-RPC requests to my deployed MCP server (a Netlify Function at /mcp). Claude Code connects to the same server fine, but my script gets back HTTP 406 on every POST. Is my server's transport misconfigured? How do I fix it?",
  judge: [
    {
      check:
        "Diagnoses the 406 as the Streamable HTTP transport rejecting a POST whose `Accept` header lacks BOTH `application/json` and `text/event-stream` -- the script isn't advertising the required media types",
    },
    {
      check:
        "Explains this is an MCP-spec requirement the CLIENT must satisfy -- a 406 means fix the client's request, not change the server",
    },
    {
      check:
        "Fix is to set the script's `Accept` header to include both `application/json` and `text/event-stream`",
    },
    {
      check:
        "Does NOT treat the server transport as broken/misconfigured, does not have the user patch `WebStandardStreamableHTTPServerTransport`, and does not escalate to Netlify as a platform bug",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
