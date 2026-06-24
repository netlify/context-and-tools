import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "MCP Servers: add a server to an existing app and reuse its data layer",
  prompt:
    "Add an MCP server to this Next.js blog so an AI agent can list all posts and fetch a single post by slug. Wire it up as part of this same site.",
  judge: [
    { check: "Adds the MCP server as one more Netlify Function on the existing site (e.g. netlify/functions/mcp.ts at path `/mcp`) rather than scaffolding a separate standalone project" },
    { check: "Tools call the blog's EXISTING data layer — `getAllPosts()` / `getPost(slug)` from `lib/posts.ts` — instead of duplicating the post data or re-implementing access to it" },
    { check: "Exposes only read-only tools (e.g. list_posts, get_post) for this read use case — does not invent write or delete tools that weren't asked for" },
    { check: "Each tool has a `zod` input schema (e.g. `{ slug: z.string() }`) and a clear one-line description written for the model" },
    { check: "Uses the official MCP SDK with its Web-standard transport (`WebStandardStreamableHTTPServerTransport`) in stateless mode (`sessionIdGenerator: undefined`, `enableJsonResponse: true`), handing it the Web `Request` — not a hand-rolled JSON-RPC handler and not the Node `fetch-to-node` bridge" },
    { check: "Protects the endpoint with an `Authorization: Bearer` check that returns 401 on failure" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
