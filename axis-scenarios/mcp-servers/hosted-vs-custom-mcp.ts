import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// "Netlify MCP" is ambiguous: Netlify's own hosted MCP server operates the
// Netlify platform (create projects, deploy, manage infra) for an agent, and is
// distinct from building your own MCP server on a Function to expose your app's
// tools and data. Grounded in netlify-mcp-servers/SKILL.md.
export default {
  name: "MCP Servers: hosted Netlify MCP vs building your own on a Function",
  prompt:
    "I want to hook my AI agent up to Netlify's MCP so it can create sites, run deploys, and manage environment variables on my Netlify account. Do I need to build and deploy an MCP server on a Netlify Function to get that?",
  judge: [
    {
      check:
        "Distinguishes the two meanings of 'Netlify MCP': Netlify publishes its OWN hosted MCP server that operates the Netlify platform on your behalf (create projects, trigger deploys, manage env vars/infrastructure), separate from a custom MCP server you build",
    },
    {
      check:
        "For this request (managing Netlify sites/deploys/env vars), points the user to Netlify's hosted MCP server -- connecting their client to it per Netlify's MCP-server docs -- and clarifies they do NOT need to build a Function for that",
    },
    {
      check:
        "Explains that building your own MCP server on a Netlify Function is the other job: exposing YOUR app's own tools and data to an agent -- not re-implementing Netlify platform operations",
    },
    {
      check:
        "Does NOT scaffold a custom MCP Function that wraps Netlify deploy/site/env-var management as tools for this request",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
