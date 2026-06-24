import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: build a remote MCP server on a Netlify Function",
  prompt:
    "Build me a remote MCP server on Netlify that exposes a single read-only tool `get_forecast(city)` returning a canned forecast string. I want to connect Claude Code to it. Just the server code and how to wire it up.",
  judge: [
    { check: "Implements the server as ONE Netlify Function (e.g. netlify/functions/mcp.ts) served at a stable path like `/mcp` via `export const config = { path: \"/mcp\" }` — not a stdio process and not a long-running standalone Node HTTP server" },
    { check: "Uses the official MCP SDK (`@modelcontextprotocol/sdk`) with `StreamableHTTPServerTransport`, letting the SDK own JSON-RPC framing and the protocol handshake rather than hand-rolling request dispatch" },
    { check: "Pins the SDK to `1.24.0` (not `1.25+`, not `latest`), because 1.25+ rejects (HTTP 406) POSTs whose `Accept` header lacks both `application/json` and `text/event-stream`, which breaks some clients" },
    { check: "Runs the transport STATELESS for serverless: `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, building a fresh server + transport per request" },
    { check: "Bridges the Web `Request`/`Response` to the Node req/res the SDK transport expects using `fetch-to-node` (`toReqRes` / `toFetchResponse`)" },
    { check: "Requires `Authorization: Bearer <token>` and returns 401 when it is missing or wrong — the endpoint is not left open" },
    { check: "Reads any secret/token with `Netlify.env.get(...)` inside the function (not `process.env`) and never hardcodes it" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
