# OpenAI plugin overlay

Source for the OpenAI Plugins (ChatGPT + Codex) submission package. The
package itself is generated — run:

```bash
npm run build:openai
```

`scripts/build-openai-plugin.mjs` copies the portable package in
`agent-plugin/`, merges `plugin.json` over its `plugin.json`, copies
`assets/` alongside it, validates the result against OpenAI's submission
rules, and zips it to
`build/openai/netlify-<version>.zip`. Upload that ZIP in the plugin
submission portal. See https://developers.openai.com/plugins/deploy/submission.

## Files

- `plugin.json` — merged over `agent-plugin/plugin.json`. Sets `name` to
  `netlify`, which must match the plugin already registered with OpenAI
  (`agent-plugin/` keeps `netlify-skills` for other hosts). Must not set
  `version`. Under `extensions.com.openai`: `interface`
  (listing metadata), and optionally `review` (test cases, demo recording URL)
  and `publication` (countries, release notes). Fields left out keep the
  values already saved in the dashboard. Paths start with `./` and are
  relative to the package root, so assets are referenced as `./assets/<file>`.
- `assets/` — icon, logo, and screenshots (PNG, JPEG, WebP, or SVG; 5 MiB
  max each). `logo.svg` is the full-color light-mode Netlify monogram, used
  for both `composerIcon` and `logo`.

## What does not go in the package

- `apps` / `.app.json` and hooks — the submission validator rejects them. The
  MCP server is already registered in ChatGPT as app
  `plugin_asdk_app_691f1f8f72408191afdbbdf8242bdf86`.
- Test-account credentials — enter them in the dashboard.

Name, version, description, and the MCP server come from `agent-plugin/`, so
release-please's version bump and the skills mirror flow through without
editing anything here.
