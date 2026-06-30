import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: per-user API keys for a multi-user server",
  prompt:
    "Several teammates will each connect to my Netlify MCP server as themselves. Set up authentication so each person has their own credential I can revoke individually, and tools act as whoever is calling.",
  judge: [
    { check: "Uses PER-USER API KEYS (each user gets their own revocable key) rather than one shared secret handed to everyone" },
    { check: "Stores only a HASH of each key (e.g. sha256) — never the plaintext — and shows the plaintext to the user exactly once, at creation" },
    { check: "Keeps a short, non-secret PREFIX of each key for display/listing so users can identify a key without exposing it" },
    { check: "Supports REVOCATION (e.g. a `revoked_at` soft-delete) scoped so a user can only revoke their OWN keys, and a revoked/inactive key is rejected on use" },
    { check: "Resolves the incoming key to a user on every request and flows that USER CONTEXT into the tool handlers, so a tool acts as / stamps the calling user (audit trail) — not as one global identity" },
    { check: "Uses Netlify Identity to gate the key-management UI where users mint keys, while the MCP endpoint itself is authenticated by the API key — not by an Identity session cookie (agents have no browser session)" },
    { check: "Does NOT jump straight to a full OAuth 2.1 server for an internal team — OAuth is for publishing a connector to arbitrary external end users. Passes vacuously if OAuth simply isn't mentioned" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
