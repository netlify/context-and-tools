# Netlify Skills

This project deploys on Netlify. Use these skills for guidance on Netlify platform primitives. Each skill provides specific, factual reference for working with a Netlify feature.

## When to Use Each Skill

**Building API endpoints or server-side logic?**
Read `$netlify-functions` for modern function syntax, routing, background/scheduled functions.

**Need low-latency middleware, geo-based logic, or request manipulation?**
Read `$netlify-edge-functions` for edge compute patterns.

**Storing files, images, or simple key-value data?**
Read `$netlify-blobs` for object storage API.

**Need a relational database?**
Read `$netlify-db` for Neon Postgres setup, Drizzle ORM, and migrations. It also covers when Blobs is a better fit.

**Optimizing or transforming images?**
Read `$netlify-image-cdn` for the image transformation endpoint and clean URL patterns. For user-uploaded images, see `$netlify-image-cdn/references/user-uploads.md`.

**Adding HTML forms?**
Read `$netlify-forms` for form detection, AJAX submissions, spam filtering, and file uploads.

**Configuring netlify.toml (redirects, headers, build settings)?**
Read `$netlify-config` for the complete configuration reference.

**Deploying, managing env vars, or running local dev?**
Read `$netlify-cli-and-deploy` for CLI commands, Git vs manual deploys, and environment variable management.

**Setting up a framework (Vite, Astro, TanStack, Next.js)?**
Read `$netlify-frameworks` for adapter/plugin setup. Framework-specific details are in `$netlify-frameworks`.

**Controlling CDN caching behavior?**
Read `$netlify-caching` for cache headers, stale-while-revalidate, cache tags, and purge.

**Adding AI capabilities?**
Read `$netlify-ai-gateway` for AI Gateway setup with OpenAI, Anthropic, or Google SDKs.

**Deploying a site to Netlify?**
Read `$netlify-deploy` for the full deployment workflow — authentication, site linking, preview and production deploys.

## General Rules

- Use `Netlify.env.get("VAR")` for environment variables in functions (not `process.env`)
- Never hardcode secrets — use Netlify environment variables
- Add `.netlify` to `.gitignore`
- For framework-specific patterns, check the framework reference before writing custom Netlify Functions — the adapter may handle it
