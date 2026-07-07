import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// OAuth is the affirmative choice when publishing a connector for arbitrary end
// users who shouldn't be handed a raw token. An OAuth-capable MCP server must
// provide OAuth 2.1 authorization + token endpoints, protected-resource
// metadata, often Dynamic Client Registration, and bearer access tokens it
// validates per request -- materially more work, best delegated to a hosted
// identity provider. Grounded in
// netlify-mcp-servers/references/connecting-clients.md.
export default {
  name: "MCP Servers: public connector for end users -- the OAuth branch",
  prompt:
    "I'm publishing an MCP connector that lots of external end users will add to Claude Desktop. I do NOT want to hand each of them a raw bearer token to paste in -- they should just click Connect and approve access. What's the right authentication approach for this, and what does it involve?",
  judge: [
    {
      check:
        "Recommends OAuth for this case -- a PUBLIC connector for arbitrary end users who shouldn't be handed a raw token; they click Connect, approve access, and the client obtains and refreshes tokens for them",
    },
    {
      check:
        "Names the surfaces an OAuth-capable MCP server must provide: OAuth 2.1 authorization + token endpoints (or delegation to an external identity provider), protected-resource metadata so the client can discover where to authorize, and bearer access tokens the server validates on each MCP request (commonly Dynamic Client Registration too)",
    },
    {
      check:
        "Sets expectations that OAuth is materially more work than a shared secret -- its own project -- and advises leaning on a hosted identity provider rather than hand-rolling the OAuth server",
    },
    {
      check:
        "Does NOT recommend a single static shared secret or hand-issued per-user API keys for this arbitrary-end-user case (that restraint is for a personal server or a small trusted group, not a public connector)",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
