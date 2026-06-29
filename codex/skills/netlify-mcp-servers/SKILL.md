---
name: netlify-mcp-servers
description: Build, deploy, and secure Model Context Protocol (MCP) servers on Netlify. Use whenever the task involves creating an MCP server, exposing an app or API to AI agents as MCP tools, letting Claude / Cursor / Claude Code call a custom remote server, or adding MCP tools to an existing Netlify site. Covers the MCP SDK + Streamable HTTP transport on a Netlify Function, authentication (single shared secret vs per-user API keys with Netlify Identity), read/write safety, file uploads, and connecting clients. Use even when the user just says "MCP", "tool server for an agent", or "let an AI use my API".
---

# Netlify MCP Servers

An MCP server exposes **tools** (and optionally resources/prompts) that an AI client — Claude Desktop, Claude Code, Cursor — can call. On Netlify, a remote MCP server is just **one Netlify Function** that speaks the MCP protocol over HTTP. This skill gets you a working, secure server and connects a client to it.

The same setup works two ways:

- **Standalone server** — a repo whose only job is the MCP endpoint (e.g. wrapping a third-party API).
- **Added to an existing app** — one more function alongside your site. Have its tools call the **same service/data layer your UI and REST routes already use**, so logic isn't duplicated.

## Before you build

Decide one thing up front, because it shapes the auth code:

- **Who calls this server?** Just you (a personal/single-user server) → use a **single shared secret**. Multiple people, each acting as themselves → use **per-user API keys** backed by Netlify Identity. See [authentication](references/authentication.md).

If you're not sure, start with the single shared secret — it's a few lines and you can layer per-user keys on later. I'll default to that unless you say otherwise.

## Stack

Use the official MCP SDK with its Web-standard Streamable HTTP transport, running statelessly inside a Netlify Function.

```bash
npm install @modelcontextprotocol/sdk zod
```

A Netlify Function already speaks the web platform — it receives a `Request` and returns a `Response`. The SDK ships a transport built on exactly those primitives, `WebStandardStreamableHTTPServerTransport` (the same core the SDK runs on internally, and what Cloudflare Workers / Deno / Bun use): you hand it the `Request` and return the `Response` it produces — no adapter, no version pin. Older guides reach for the Node-flavored `StreamableHTTPServerTransport` plus a `fetch-to-node` bridge to synthesize the Node `req`/`res` objects it expects; on Netlify you need neither, and skipping them is both simpler and what's verified to work here.

One gotcha, independent of all this: the transport returns **HTTP 406** to any POST whose `Accept` header lacks *both* `application/json` and `text/event-stream`. That's an MCP-spec requirement the *client* must satisfy — a 406 means fix the client's `Accept` header, not the server. Letting the SDK own the protocol also means you don't hand-maintain JSON-RPC framing or the protocol-version handshake.

## The server function

With the Web-standard transport this is a few lines — most of what older guides show was the Node bridge, which you don't need. Put it in `netlify/functions/mcp.ts`:

```typescript
import type { Config, Context } from "@netlify/functions";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { checkBearer } from "../lib/mcp/bearer"; // see Authentication

function buildServer() {
  const server = new McpServer({ name: "my-mcp", version: "0.1.0" });

  server.tool(
    "get_item",
    "Fetch a single item by id. Read-only.",
    { id: z.string().describe("The item's unique id") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await getItem(id)) }],
    }),
  );

  return server;
}

export default async (req: Request, _context: Context) => {
  if (!checkBearer(req)) return new Response("Unauthorized", { status: 401 });

  // Stateless JSON server: it only does request/response over POST. Reject other
  // methods — a GET makes the transport open an SSE stream that never closes, which
  // a serverless function can't serve (you'll get a 502).
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Fresh server + transport per request, no session to persist. enableJsonResponse
  // returns one application/json body instead of an SSE stream — the right fit here.
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Hand over the Web Request, return the Web Response. The transport owns JSON-RPC
  // framing, body parsing (a malformed body comes back as a clean 400), and the handshake.
  await server.connect(transport);
  return transport.handleRequest(req);
};

export const config: Config = { path: "/mcp" };
```

That's a complete, deployable server. Everything else is tools, auth, and safety.

## Defining tools

Each tool is a `name`, a one-line `description`, a `zod` input schema, and a handler that returns `{ content: [...] }`. The description and parameter `.describe()` text are the only thing the model sees — write them like API docs for an agent: say what the tool does, when to use it, and call out anything irreversible.

As the count grows, give each tool its own module and register them in `buildServer()`. Servers with many tools often keep a registry (an array of `{ name, description, inputSchema, handler }`) and wire `tools/list` + `tools/call` once — the transport setup above is identical either way.

## Authentication

The MCP client must prove it's allowed to call your server. Every request carries `Authorization: Bearer <token>`; reject anything else with a 401.

**Single shared secret** (personal / single-user). One env var, compared in constant time. Put this in `netlify/lib/mcp/bearer.ts`:

```typescript
import { timingSafeEqual } from "node:crypto";

export function checkBearer(req: Request): boolean {
  const expected = Netlify.env.get("MCP_BEARER_TOKEN");
  if (!expected) return false;
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  // Length check first because timingSafeEqual throws (RangeError) on unequal-length
  // buffers. The token is fixed-length, so the early return leaks nothing useful.
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Generate the token with `openssl rand -hex 32` and store it as a secret env var.

**Per-user API keys** (multi-user). Netlify Identity gates a web UI where each user mints their own keys; you store only a **hash** of each key (never the plaintext) tied to that user, resolve the key to a user on every request, and flow that user into your tool handlers so tools act as the right person. Full pattern — schema, generation, hashing, revocation, resolving the user — in [authentication](references/authentication.md).

## Safety and permissions

Tools are a public API handed to an autonomous agent. Be deliberate:

- **Expose the least that does the job.** Separate reads from writes, and think hard before exposing destructive tools. A common, sound choice is to **omit delete tools entirely** and keep destructive actions in a human-operated UI.
- **Guard irreversible or public actions** by putting explicit instructions in the tool's description — e.g. "show the user the exact text and get confirmation before posting." This is a soft, model-level guard, so back it with a real kill switch: a token you can revoke instantly.
- **Keep the client's credential separate from your backend's.** The client authenticates to your server (bearer/API key); your server authenticates to the database or third-party API with its *own* secret. Never pass your backend god-key out to the client.
- **Use least-privilege backend credentials** — app passwords or scoped tokens, not account-level ones, so a leak is contained and revocable.
- **Validate inputs** (your `zod` schemas do this) and **log every tool call** so you can see what the agent did — `console.info` shows up in Netlify function logs.

## File uploads

When a tool needs the agent to supply a file (an image to post, a doc to attach), don't push the bytes through the tool call as base64 — it bloats the model's context and runs into payload limits. Instead hand the agent a short-lived, single-use **presigned URL** to `PUT` the raw bytes to, store them in **Netlify Blobs**, and reference the file by a stable key from your other tools. Sign the URL with an **HMAC** (over the upload id, content-type, size, and expiry) keyed by a secret env var and verify it in constant time — the signature *is* the authorization, so the `PUT` carries no bearer token. On the upload endpoint, enforce the declared content-type and size and reject replays. Full three-step flow (`prepare_upload` → `PUT` → `finalize_upload`) with code: [file uploads](references/file-uploads.md).

## Connecting a client

Native remote-MCP support is now the norm; reach for the `mcp-remote` bridge only as a fallback.

- **Claude Code** — `claude mcp add --transport http my-mcp https://<site>.netlify.app/mcp --header "Authorization: Bearer <token>"`
- **Cursor** — add the server to `mcp.json` with the URL and an `Authorization` header.
- **Claude Desktop / claude.ai** — add a **Custom Connector** (Settings → Connectors). Connectors are OAuth-oriented; for a static-bearer server the `mcp-remote` bridge is the reliable path.
- **Fallback (older / stdio-only clients)** — `npx mcp-remote https://<site>.netlify.app/mcp --header "Authorization: Bearer <token>"`

Full client matrix and the OAuth / Custom Connector deep-dive: [connecting clients](references/connecting-clients.md).

## Local dev and deploy

- **Run it:** `netlify dev` serves the function at `http://localhost:8888/mcp`.
- **Test it:** the MCP Inspector — `npx @modelcontextprotocol/inspector` — connect via Streamable HTTP to your URL with an `Authorization: Bearer` header and list/call tools. Or point `claude mcp add --transport http` at the localhost URL.
- **Identity caveat:** Netlify Identity does **not** work under `netlify dev`, so per-user-key auth must be tested on a deploy preview. See the **netlify-identity** skill.
- **Deploy:** push to Git, or `netlify deploy --build --prod`.
- **Secrets:** set tokens/keys as env vars (`netlify env:set MCP_BEARER_TOKEN <value> --secret`) — never in code.

## Cross-cutting rules

- Never hardcode secrets. Store tokens, API keys, and signing secrets as Netlify environment variables (mark them secret).
- Inside functions, read env vars with `Netlify.env.get("VAR")`, not `process.env`.
- Add `.netlify` to `.gitignore`.

## Related skills and references

- [authentication](references/authentication.md) — single-secret vs per-user API keys (Identity) in depth.
- [connecting clients](references/connecting-clients.md) — full client matrix, OAuth, and Custom Connectors.
- [file uploads](references/file-uploads.md) — letting an agent upload images/files via presigned URLs to Netlify Blobs.
- **netlify-functions** — function syntax, routing, limits. **netlify-identity** — Identity setup. **netlify-database** / **netlify-blobs** — where to store keys and files. **netlify-cli-and-deploy** — deploys and env vars.
