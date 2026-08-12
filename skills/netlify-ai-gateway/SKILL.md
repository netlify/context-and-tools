---
name: netlify-ai-gateway
description: Use OpenAI, Anthropic, Google Gemini, or OpenRouter models from Netlify Functions or Edge Functions without managing provider API keys or accounts — the gateway injects credentials automatically. Reach for this when you add an AI chatbot or completion endpoint, generate images or text with Gemini/GPT/Claude, summarize form submissions with AI, build an LLM-backed API route, stream a long AI generation, or wire up any server-side AI provider call on Netlify. Covers provider SDK setup, injected env vars, model availability, rate limits, credit costs, streaming for long generations, and local dev with netlify dev or the Vite plugin.
---

# Netlify AI Gateway

Call AI providers from Netlify server-side compute using each provider's **official SDK** with zero credential config — the gateway injects the API keys and base URLs the SDKs already read. Instantiate the client with no args (except OpenRouter, which needs an explicit base URL).

**Never do these** (they silently fail or cost money):
- **Not browser-callable.** The gateway lives in Functions/Edge Functions only. Never call it from client-side React/browser code.
- **Runtime-only credentials.** Never call the gateway from build scripts, prerender/SSG, or build plugins — those get no credentials and fail. Do AI work at request time; cache to Netlify Blobs if output must look precomputed.
- **60s sync timeout.** A slow generation in a synchronous function is killed at 60s. Stream it (SDK streaming + `ReadableStream`), or use a background function that persists output for the client to fetch.
- **Requires a production deploy.** The gateway does not activate until the project has at least one production deploy — even in local dev.
- **Don't hardcode model lists.** Model availability changes; check the live providers endpoint rather than baking in IDs.

## Function example

File: `netlify/functions/joke.js` (`mkdir -p netlify/functions`). Install: `npm install openai`.

```js
import process from "process";
import OpenAI from "openai";

export default async () => {
  const client = new OpenAI(); // reads OPENAI_API_KEY + OPENAI_BASE_URL
  try {
    const res = await client.responses.create({
      model: "gpt-5-mini",
      input: [{ role: "user", content: "Give me a random short dad joke" }],
      reasoning: { effort: "minimal" },
    });
    return Response.json({
      joke: res.output_text?.trim() || "Out of jokes",
      model: res.model,
      tokens: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    });
  } catch (e) {
    return Response.json({ error: `${e}` }, { status: 500 });
  }
};

export const config = { path: "/api/joke" }; // route, local + deployed
```

Client-side fetch just hits the route:

```jsx
const res = await fetch("/api/joke");
const data = await res.json();
```

## Provider SDKs (modern — instantiate with no args)

Each SDK auto-reads the injected env vars. **OpenRouter is the exception:** its base URL must be passed explicitly.

```js
// Anthropic — npm i @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic(); // ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL
await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

```js
// OpenAI — npm i openai
import OpenAI from 'openai';
const openai = new OpenAI(); // OPENAI_API_KEY + OPENAI_BASE_URL
await openai.chat.completions.create({
  model: 'gpt-5',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

```js
// Google Gemini — npm i @google/genai
import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI({}); // GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL
await genAI.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: 'Hello!',
});
```

```js
// OpenRouter — npm i @openrouter/sdk — base URL REQUIRED
import { OpenRouter } from '@openrouter/sdk';
const openRouter = new OpenRouter({
  serverURL: process.env.OPENROUTER_BASE_URL, // API key auto-read from OPENROUTER_API_KEY
});
await openRouter.chat.send({
  chatRequest: {
    model: 'x-ai/grok-4.5',
    messages: [{ role: 'user', content: 'Hello!' }],
  },
});
```

**OpenRouter models via the OpenAI SDK:** you can reach any OpenRouter-served model (xAI, DeepSeek, Meta, Mistral, Qwen) through the plain OpenAI SDK — just pass the model ID in OpenRouter notation, no extra config:

```js
await openai.chat.completions.create({
  model: 'deepseek/deepseek-v4-flash-0731',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Injected environment variables

Set in all Netlify compute contexts at function init **only if you have not already set them** at project/team level (Netlify never overrides your keys):

| Provider | Vars |
| --- | --- |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_BASE_URL` |
| Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| Google Gemini | `GEMINI_API_KEY`, `GOOGLE_GEMINI_BASE_URL` |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` |

**Gemini special case:** Netlify will **not** inject `GEMINI_API_KEY` / `GOOGLE_GEMINI_BASE_URL` if either `GOOGLE_API_KEY` or `GOOGLE_VERTEX_BASE_URL` is set (use those to point at Vertex or your own Google credentials).

**Always injected, never collide with your provider vars:**
- `NETLIFY_AI_GATEWAY_KEY`
- `NETLIFY_AI_GATEWAY_BASE_URL`

Use the SDK path with the per-provider injected vars above as your default. Reach for `NETLIFY_AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_BASE_URL` only when a third-party or unsupported library needs the credentials passed explicitly — that's the correct time to configure them by hand.

## Local dev

Two supported paths — both still require an existing production deploy:
- **Netlify CLI:** `netlify dev` (full support). Needs `npm install -g netlify-cli@latest` and `netlify login`.
- **Netlify Vite plugin:** install `@netlify/vite-plugin`, add `netlify()` to `vite.config.js` plugins, run your normal `npm run dev` — gateway access without `netlify dev`.

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  plugins: [react(), netlify()],
})
```

## Enable & deploy

1. Be on a credit-based plan (Free, Personal, Pro; Enterprise via Account Manager). Legacy plans must switch to a current plan.
2. Link a project: `netlify init`.
3. **Deploy to production at least once** — required to activate: `netlify deploy --prod --open`.
4. Don't disable AI Features; don't set your own provider keys unless you intend to override.

## Constraints & gotchas

- **Plan gating:** Credit-based plans only (Free/Personal/Pro; Enterprise via Account Manager).
- **Context window:** input capped at **200k tokens**.
- **Rate limits** (per team, across all projects, per minute, in credits): Free 90 / Personal 450 / Pro 1,800 / Enterprise 9,000. Set up [rate limiting rules](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/) on AI functions to prevent visitor abuse driving up cost.
- **Credit cost:** tokens → USD (provider published rates) → credits. **$1 USD of usage = 180 credits.** Enable [auto recharge](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/configure-auto-recharge/) or buy [credit packs](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/buy-credit-packs/) to meet demand.
- **No request headers passed through** — you can't enable proprietary header-gated experimental features.
- **Batch inference not supported.**
- **OpenAI priority processing not supported.**
- **Prompt caching:** Anthropic — only the default 5-minute ephemeral cache; OpenAI — a per-account `prompt_cache_key` is set; Gemini — explicit context caching not supported.
- **Zero Data Retention only:** the gateway only routes to ZDR providers. A model listed in the OpenRouter directory is **not** served if no ZDR host offers it. Browse the ZDR-filtered catalog at https://openrouter.ai/models?zdr=true.
- **Model list is dynamic** — served-directly models (Anthropic, OpenAI, Gemini) are enumerated from a live endpoint; OpenRouter-served models (xAI, DeepSeek, Meta, Mistral, Qwen) use OpenRouter notation. Don't hardcode; check availability at runtime.
- **Privacy:** the gateway does not store prompts or outputs.

## Reference

- Full docs, quickstart, and example projects (AI SEO Image Generator, form-submission summaries, TanStack Start chat app) at [AI Gateway overview](https://docs.netlify.com/build/ai-gateway/overview.md) and [quickstart](https://docs.netlify.com/build/ai-gateway/quickstart-for-ai-gateway.md).

<!-- GAP: source does not enumerate concrete model IDs (dynamic live endpoint); model names in examples are illustrative only. -->
<!-- GAP: SDK streaming + background-function patterns are mandated by house rules but no streaming code example exists in the source. -->

<!-- system: agent-context/ai-gateway/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (ai-gateway)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. Use the provider SDK with the injected env credentials — don't hand-roll
   a raw `fetch()` against the gateway, even though raw REST is a supported
   surface. The body must not present raw REST or the
   `NETLIFY_AI_GATEWAY_KEY` / `NETLIFY_AI_GATEWAY_BASE_URL` pair as a
   recommended path — but it MUST still document the pair as facts: always
   injected, never collide with user-set provider vars, and the right choice
   when a third-party or unsupported library needs explicit configuration.
   Demote the recommendation; keep the knowledge.
2. The gateway is not browser-callable: calls belong in functions or edge
   functions, never client-side code.
3. Model availability changes: don't hardcode model lists; check the live
   providers endpoint.
4. Gateway credentials are runtime-only: never call the gateway from build
   scripts, prerender/SSG, or build plugins — those calls get no credentials
   and fail. Do AI work at request time and cache the result (e.g. to
   Netlify Blobs) if it must look precomputed.
5. Gateway calls in a synchronous function are bound by the 60-second
   timeout: stream long generations (SDK streaming + `ReadableStream`), or
   use a background function that persists output for the client to fetch —
   never leave a slow generation unstreamed and assume it finishes.
