import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Netlify Functions do not add CORS headers automatically. Native MCP clients
// (Claude Code, Cursor, Desktop, mcp-remote) are not browsers and need none, but
// a browser-based client triggers a preflight OPTIONS that the POST-only server
// rejects with 405 -- the function must answer OPTIONS and set Access-Control-*
// headers itself, before the 405 check. Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: browser-based MCP client blocked by CORS on a POST-only server",
  prompt:
    "I built a small web dashboard that calls my MCP server (a Netlify Function at /mcp) directly from the browser with fetch. Claude Code talks to the server fine, but from the browser I get 'blocked by CORS policy: No Access-Control-Allow-Origin header'. Is my Netlify Function or the platform broken? How do I fix it?",
  judge: [
    {
      check:
        "Diagnoses the cause as missing CORS handling: Netlify Functions do NOT add CORS headers automatically, so the browser's cross-origin request is blocked for want of an `Access-Control-Allow-Origin` header -- it is not a broken function or a Netlify platform bug to escalate",
    },
    {
      check:
        "Explains the browser sends an `OPTIONS` preflight first, and the POST-only server rejects every non-POST method with 405 -- so the preflight fails; the function must answer `OPTIONS` itself with a 2xx (e.g. 204) BEFORE the 405 check",
    },
    {
      check:
        "Sets the needed CORS headers in the function: `Access-Control-Allow-Origin` on the response, plus `Access-Control-Allow-Methods` (including POST) and `Access-Control-Allow-Headers` (including Authorization / Content-Type) on the preflight response",
    },
    {
      check:
        "Notes CORS only matters for a BROWSER-based client -- native MCP clients (Claude Code, Cursor, Claude Desktop, the mcp-remote bridge) are not browsers, don't enforce same-origin, and need no CORS, which is why Claude Code worked",
    },
    {
      check:
        "Fixes it in the function code (the function sets the headers / answers OPTIONS), not by escalating to Netlify as a platform bug or by loosening the server's auth",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
