---
name: netlify-ai-gateway
description: Reference for Netlify AI Gateway — the managed proxy that routes calls to OpenAI, Anthropic, and Google Gemini SDKs without provider API keys. Use this skill any time the user wants to add AI on a Netlify site (chat, completion, reasoning, image generation, image-to-image edit/stylize), choose or change a model, wire up the OpenAI / Anthropic / @google/genai SDK, decide which provider to use for an image-gen feature (it's Gemini-only on the gateway), or debug "model not found" / "API key missing" against the gateway. Required reading before pinning a model — the gateway exposes a curated subset, not every provider model.
---

# Netlify AI Gateway

> **IMPORTANT:** Only use models listed in the "Available Models" section below. AI Gateway does not support every model a provider offers. Using an unsupported model returns an HTTP error from the gateway.

> **First-deploy requirement:** The AI Gateway only activates after a site has had at least one production deploy. Local dev (`netlify dev`, `@netlify/vite-plugin`) will NOT have gateway access on a brand-new project until you deploy to production once.

Netlify AI Gateway provides access to AI models from multiple providers without managing API keys directly. It is available on all Netlify sites.

## How It Works

The AI Gateway acts as a proxy — you use standard provider SDKs but point them at Netlify's gateway URL. Netlify auto-injects both the base URL and a placeholder API key for each provider, then authenticates upstream on your behalf.

## Setup

1. Enable AI on your site in the Netlify UI
2. Deploy to production at least once — the gateway does not activate until then
3. Install the provider SDK you want to use

Don't set your own `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY` (the `@google/genai` SDK reads either `GEMINI_API_KEY` or `GOOGLE_API_KEY`). Doing so disables Netlify's auto-injection and routes calls directly to the provider, bypassing the gateway.

## Using OpenAI SDK

```bash
npm install openai
```

```typescript
import OpenAI from "openai";

const openai = new OpenAI();
// `OPENAI_API_KEY` and `OPENAI_BASE_URL` are auto-injected; the SDK
// reads both from the environment, so no constructor args are needed.

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## Using Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` are auto-injected; the SDK
// reads both from the environment, so no constructor args are needed.

const message = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
```

## Using Google Gemini SDK

Use `@google/genai` (the unified Google GenAI SDK). The older `@google/generative-ai` package does not pick up the gateway env vars.

```bash
npm install @google/genai
```

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
// `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL` are auto-injected. The SDK also
// honors `GOOGLE_API_KEY`; leave both Gemini keys unset so the gateway's
// injection isn't shadowed.

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Hello!",
});

const text = response.text;
```

## In a Netlify Function

```typescript
import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";

export default async (req: Request, context: Context) => {
  const { prompt } = await req.json();
  const openai = new OpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return Response.json({
    response: completion.choices[0].message.content,
  });
};

export const config: Config = {
  path: "/api/ai",
  method: "POST",
};
```

## Image Generation

Image generation on the gateway is supported through **Gemini image models** (e.g., `gemini-2.5-flash-image`, `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`). OpenAI's image models (`gpt-image-1`, `dall-e-*`) are **not** routed through the gateway.

Both text-to-image and image-to-image use the same `generateContent` method as chat — only the model and response shape differ. The image is returned as base64 `inlineData` on a content part, not as a URL.

### Text-to-image

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image",
  contents: "A watercolor portrait of a corgi wearing a beret",
});

const imagePart = response.candidates[0].content.parts.find(
  (p) => p.inlineData,
);
const base64 = imagePart.inlineData.data;
const mimeType = imagePart.inlineData.mimeType; // e.g. "image/png"
const bytes = Buffer.from(base64, "base64");
```

### Image-to-image (edit / stylize an input image)

Pass the source image as an additional content part with `inlineData`:

```typescript
const sourceBase64 = sourceBuffer.toString("base64");

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image",
  contents: [
    { text: "Restyle this photo as a Picasso-era cubist portrait" },
    { inlineData: { mimeType: "image/png", data: sourceBase64 } },
  ],
});
```

The response shape is the same — pull `base64` and `mimeType` off the first part with `inlineData`. Most callers persist the bytes to Netlify Blobs (see `netlify-blobs/SKILL.md`) and serve a URL back to the client rather than returning multi-MB base64 in the function response.

## Environment Variables

All of these are injected automatically by Netlify when AI is enabled. Setting your own value for any of the per-provider vars disables gateway routing.

| Variable | Provider | Purpose |
|---|---|---|
| `OPENAI_BASE_URL` | OpenAI | Gateway endpoint |
| `OPENAI_API_KEY` | OpenAI | Placeholder; satisfies the SDK's "key required" check |
| `ANTHROPIC_BASE_URL` | Anthropic | Gateway endpoint |
| `ANTHROPIC_API_KEY` | Anthropic | Placeholder; satisfies the SDK's "key required" check |
| `GOOGLE_GEMINI_BASE_URL` | Google Gemini | Gateway endpoint |
| `GEMINI_API_KEY` | Google Gemini | Placeholder; satisfies the SDK's "key required" check |
| `NETLIFY_AI_GATEWAY_BASE_URL` | (universal) | Provider-agnostic gateway endpoint |
| `NETLIFY_AI_GATEWAY_KEY` | (universal) | Provider-agnostic gateway key |

The real upstream API keys live on Netlify's side. The per-provider `*_API_KEY` vars are placeholders so the SDKs construct successfully; the gateway authenticates server-side.

## Local Development

With `@netlify/vite-plugin` or `netlify dev`, gateway environment variables are injected automatically into the local process — but only after the site has had at least one production deploy. A brand-new local-only project will see "API key missing" or "model not found" errors until you deploy.

Local injection also requires the working directory to be **linked** to the Netlify site. `netlify dev` pulls the gateway base URL and placeholder key from the linked site's environment, so an unlinked directory has no site context — nothing is injected and gateway calls fail even when the site has already been deployed to production. Run `netlify link` (or `netlify init`) in the project first, then start `netlify dev`. A bare framework dev server started outside `netlify dev` / `@netlify/vite-plugin` also gets no gateway env vars.

## Usage metering and where the gateway runs

**Gateway usage is credit-metered.** Calls draw down your Netlify AI credit/inference allowance; when that limit is reached the gateway **pauses** and returns errors until the allowance resets or is raised. There's no separate provider bill to fall back on — an unbounded loop of gateway calls burns the allowance and then starts failing, so budget for it and don't retry indefinitely.

**Gateway credentials are runtime-only.** Netlify injects the base URL and placeholder key only into runtime compute — deployed functions, edge functions, and server-rendered routes at request time. They are **not** present during the build: AI calls made at build time, in prerender/SSG, or in a build plugin get no gateway credentials and fail. Do AI work at request time (in a function or server route) and cache the result if you need it to look precomputed (e.g. to Netlify Blobs) — don't call the gateway from build scripts or static-generation hooks.

## No browser-callable gateway — proxy through server code

Gateway credentials are injected only into server-side runtime compute (functions, edge functions, server-rendered routes). There is **no browser-callable gateway endpoint**: client-side JavaScript has no gateway credentials, and there is no public URL a browser can hit to reach the gateway directly. Client code (React/Vue/vanilla JS running in the browser) that constructs a provider SDK against the gateway will find no key and fail — and "fixing" it by hardcoding a real provider key in the client leaks that key to every visitor AND bypasses the gateway (a user-set key disables Netlify's auto-injection).

The correct pattern is to proxy: put the gateway call in a **Netlify Function** (or edge function / server route), and have the browser `fetch()` your own endpoint (e.g. `/api/chat`). The function talks to the gateway server-side with the auto-injected credentials and returns the result to the client. Never import a provider SDK into a browser bundle to call the gateway, and never expose a provider API key to the client.

## Long generations and the function timeout

A gateway call runs inside your function, so it is bound by the **60-second synchronous function timeout**. Large completions, reasoning models, and image generations can run longer than that, and a synchronous function that exceeds the ceiling is terminated before it can respond. Two mitigations:

- **Stream the response.** Enable streaming on the SDK call and return a `ReadableStream` (e.g. `Content-Type: text/event-stream`), forwarding the provider's tokens/chunks as they arrive — for example `stream: true` on the OpenAI SDK, `client.messages.stream(...)` on Anthropic, or `generateContentStream(...)` on `@google/genai`. Streaming sends bytes to the client incrementally instead of buffering the whole completion inside the sync window, and is the right default for interactive chat and long text.
- **Use a background function** for long, fire-and-forget jobs (batch generation, large image renders). Background functions run up to 15 minutes, but they return a `202` immediately and their return value is ignored — they cannot hand the result back to the caller. Persist the output (e.g. to Netlify Blobs or a database) and have the client poll or fetch it.

Don't leave a slow synchronous generation unstreamed and assume it will finish — bound the model and `max_tokens`, and choose streaming or a background function based on how long the job runs.

## Errors & Troubleshooting

- **Unsupported model:** the gateway returns an HTTP error. Check the "Available Models" list below — the gateway exposes a curated subset, not every model the provider offers.
- **`OPENAI_API_KEY missing` (or equivalent) at runtime:** AI Features are disabled on the site, or the project has not had a production deploy yet.
- **Calls succeed but skip the gateway / aren't tracked:** check you haven't set your own `*_API_KEY`. Any user-set provider key shadows Netlify's auto-injection and routes directly to the provider.
- **Limits:** 200k-token context window. Batch inference, custom request headers, and OpenAI priority processing are not supported. Anthropic prompt caching is limited to the 5-minute ephemeral cache; Gemini explicit caching is not supported.

## Available Models

_Verified 2026-04-30 against the live AI Gateway providers list. The user-facing reference is https://docs.netlify.com/build/ai-gateway/overview/ — re-check before pinning a new model._

### Anthropic (chat)
- `claude-haiku-4-5`, `claude-haiku-4-5-20251001`
- `claude-sonnet-4-0`, `claude-sonnet-4-20250514`, `claude-sonnet-4-5`, `claude-sonnet-4-5-20250929`, `claude-sonnet-4-6`
- `claude-opus-4-1-20250805`, `claude-opus-4-20250514`, `claude-opus-4-5`, `claude-opus-4-5-20251101`, `claude-opus-4-6`, `claude-opus-4-7`

### OpenAI (chat / reasoning / Codex)
- gpt-4 family: `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- gpt-5: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-pro`, `gpt-5-codex`; dated: `gpt-5-2025-08-07`, `gpt-5-mini-2025-08-07`
- gpt-5.1: `gpt-5.1`, `gpt-5.1-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`; dated: `gpt-5.1-2025-11-13`
- gpt-5.2: `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.2-pro`; dated: `gpt-5.2-2025-12-11`, `gpt-5.2-pro-2025-12-11`
- gpt-5.3: `gpt-5.3-chat-latest`, `gpt-5.3-codex` (no unversioned `gpt-5.3`)
- gpt-5.4: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.4-pro`; dated: `gpt-5.4-2026-03-05`, `gpt-5.4-mini-2026-03-17`, `gpt-5.4-nano-2026-03-17`, `gpt-5.4-pro-2026-03-05`
- gpt-5.5: `gpt-5.5`, `gpt-5.5-pro`; dated: `gpt-5.5-2026-04-23`, `gpt-5.5-pro-2026-04-23`
- Reasoning (o-series): `o3`, `o3-mini`, `o4-mini`

### Google Gemini (chat + image)
- Chat: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3.1-pro-preview-customtools`, `gemini-flash-latest`, `gemini-flash-lite-latest`
- Image: `gemini-2.5-flash-image`, `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`

