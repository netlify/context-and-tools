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
        "Steers away from building a full per-tool scope / RBAC / permission-tier system up front, recommending the simplest all-or-nothing model first: a valid key can call every tool, acting as the user it belongs to",
    },
    {
      check:
        "Says to add per-key scopes only when there's a genuine need (e.g. a read-only key) and to keep it simple until a real requirement actually appears",
    },
    {
      check:
        "Does not scaffold an elaborate role hierarchy / permission-tier system for a requirement the user hasn't actually established",
    },
    {
      check:
        "Does not present 'simple' as 'no auth' -- the all-or-nothing model still requires a valid per-user key on every request and 401s anything else; the restraint is about scope granularity, not skipping authentication. Passes vacuously if auth strength isn't discussed",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
