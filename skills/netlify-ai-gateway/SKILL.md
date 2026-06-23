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

Don't set your own `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`. Doing so disables Netlify's auto-injection and routes calls directly to the provider, bypassing the gateway.

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

const client = new Anthropic({
  baseURL: Netlify.env.get("ANTHROPIC_BASE_URL"),
});
// `ANTHROPIC_API_KEY` is auto-injected — no `apiKey` arg needed.

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
// `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL` are auto-injected.

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

Image generation on the gateway is supported through **Gemini image models** (e.g., `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`). OpenAI's image models (`gpt-image-1`, `dall-e-*`) are **not** routed through the gateway.

Both text-to-image and image-to-image use the same `generateContent` method as chat — only the model and response shape differ. The image is returned as base64 `inlineData` on a content part, not as a URL.

### Text-to-image

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
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
  model: "gemini-3.1-flash-image-preview",
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
- Chat: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-pro-preview-customtools`, `gemini-flash-latest`, `gemini-flash-lite-latest`
- Image: `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`

