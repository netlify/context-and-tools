import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Scoping restraint for per-user API keys: the simplest model is all-or-nothing
// (a valid key can call every tool, as the user it belongs to). Add per-key
// scopes only when genuinely needed (e.g. a read-only key); keep it simple until
// a real requirement appears. Grounded in
// netlify-mcp-servers/references/authentication.md.
export default {
  name: "MCP Servers: don't over-engineer per-key scopes up front",
  prompt:
    "I'm building per-user API key auth for my MCP server -- multiple people, each with their own key. Before I ship, I want to design a full RBAC layer: per-tool scopes, permission tiers, and role hierarchies so every key can be locked to exactly the tools it needs. How should I structure all those scopes?",
  judge: [
    {
      check:
        "Leads with (or clearly recommends) the simplest all-or-nothing model as the starting point — a valid key can call every tool, acting as the user it belongs to — rather than presenting a full per-tool scope / RBAC system as the default to ship now. It is fine to ALSO show how scopes could be structured (the user asked), as long as the simple baseline is offered first as the recommended starting point.",
    },
    {
      check:
        "Frames per-key scopes / RBAC as something to add when a concrete need actually appears (e.g. a read-only key) rather than as a mandatory upfront layer — i.e. conveys 'grow into this when you need it,' not 'build it all now.' Explaining how to structure scopes for that eventual need is acceptable as long as it's framed as deferred.",
    },
    {
      check:
        "Does not push an elaborate role hierarchy / permission-tier system as necessary for this app right now — showing how one could be structured in response to the request is fine, but it must be framed as optional/deferred, not as required upfront complexity the user should build before shipping.",
    },
    {
      check:
        "Does not present 'simple' as 'no auth' -- the all-or-nothing model still requires a valid per-user key on every request and 401s anything else; the restraint is about scope granularity, not skipping authentication. Passes vacuously if auth strength isn't discussed",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
