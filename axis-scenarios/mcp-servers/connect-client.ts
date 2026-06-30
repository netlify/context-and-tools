import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: connect a client to a deployed server, native-first",
  prompt:
    "My MCP server is deployed at https://my-tools.netlify.app/mcp and uses a static bearer token. How do I connect Claude Code to it? And what about Cursor and Claude Desktop?",
  judge: [
    { check: "Leads with NATIVE remote-MCP connection over Streamable HTTP, not the `mcp-remote` bridge. For Claude Code: `claude mcp add --transport http <name> https://my-tools.netlify.app/mcp --header \"Authorization: Bearer <token>\"`" },
    { check: "For Cursor, shows the native config in `mcp.json` with the server `url` and an `Authorization` header carrying the bearer token" },
    { check: "Treats `mcp-remote` (`npx -y mcp-remote <url> --header ...`) as a FALLBACK for older / stdio-only clients or ones that can't set headers — not as the primary or default way to connect" },
    { check: "For Claude Desktop / claude.ai, points to a Custom Connector but notes connectors are OAuth-oriented, so a static-bearer server may need the `mcp-remote` fallback there rather than a clean native header field" },
    { check: "Passes the token via an `Authorization: Bearer` header that matches the server's check, and does not invent a different auth mechanism or put the token in the URL" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
