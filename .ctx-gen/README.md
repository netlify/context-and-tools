# Context Pipeline receiver (Stage 2)

This is the **receiving** side of the [Context Pipeline](https://linear.app/netlify/issue/AX-97) (AX-97).

`netlify/docs` is the source of truth. Its `ctx-gen` distills docs into an
`agent-context/<grouping>/` intermediate and — per grouping — generates and
AXIS-tests a full skill at `agent-context/<grouping>/skill/`. When that changes,
docs notifies this repo.

This repo's job is **deterministic distribution**: pull the generated skill and
import it, byte for byte, into `skills/`. No model call, no content rewrite —
authoring and testing happen upstream, so a faithful copy is enough. (If we ever
transform content here, that's the point at which this repo would add its own
AXIS scenarios.)

## Pieces

- **`config.json`** — which docs groupings we consume and the local skill each
  maps to (`functions` → `netlify-functions`), plus `importerVersion` (bump to
  force a re-import when the import logic itself changes).
- **`state.json`** — the delta cache. Per grouping we record the
  `manifest.generation.source_hash` we last imported. Unchanged hash → skip, so
  repeated notifications for the same docs commit are no-ops.
- **`../scripts/ctx-receive.mjs`** — reads the two files above against a docs
  checkout, imports changed groupings, updates the cache.
- **`../.github/workflows/ctx-pipeline-receive.yml`** — resolves the docs ref,
  checks out docs, runs the importer, and opens a draft PR when something
  changed. That PR runs the existing `validate-skills` and
  `build-generated-outputs` (cursor/codex parity) gates; a human reviews and
  merges. Rollback = revert.

## Running it locally

```bash
node scripts/ctx-receive.mjs --docs <path-to-a-netlify-docs-checkout> --dry-run
```

Drop `--dry-run` to write the import. `--skills-dir` and `--state` can point at
throwaway paths to test without touching tracked files.
