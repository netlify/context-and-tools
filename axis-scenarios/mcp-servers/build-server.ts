import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: build a remote MCP server on a Netlify Function",
  prompt:
    "Build me a remote MCP server on Netlify that exposes a single read-only tool `get_forecast(city)` returning a canned forecast string. I want to connect Claude Code to it. Just the server code and how to wire it up.",
  judge: [
    { check: "Implements the server as ONE Netlify Function (e.g. netlify/functions/mcp.ts) served at a stable path like `/mcp` via `export const config = { path: \"/mcp\" }` — not a stdio process and not a long-running standalone Node HTTP server" },
    { check: "Uses the official MCP SDK (`@modelcontextprotocol/sdk`) and lets it own JSON-RPC framing and the handshake (no hand-rolled dispatch). On Netlify, uses the Web-standard transport `WebStandardStreamableHTTPServerTransport`, handing it the Web `Request` and returning the `Response` it produces" },
    { check: "Does NOT add a `fetch-to-node` bridge or convert to Node `req`/`res` objects, and does NOT pin the SDK to an old version to make that work — a Netlify Function is already Web-standard, so the current SDK's web transport needs no adapter" },
    { check: "Runs the transport STATELESS for serverless: `new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, building a fresh server + transport per request" },
    { check: "Requires `Authorization: Bearer <token>` and returns 401 when it is missing or wrong — the endpoint is not left open" },
    { check: "Reads any secret/token with `Netlify.env.get(...)` inside the function (not `process.env`) and never hardcodes it" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
