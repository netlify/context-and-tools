# 2026-08-19 — AX-136: receiver imports on byte difference

## Intent

A hand edit to a grouping's `skill/**` upstream in netlify/docs propagates to
context-and-tools on the next dispatch, exactly like a machine regeneration.
Silent skips of real content changes are eliminated: after this lands,
"changed" means the imported surface actually differs, byte for byte.

Live victim this must fix: netlify/docs#801 hand-edits
`agent-context/frameworks/skill/SKILL.md` and
`skill/references/nextjs.md` without touching `manifest.json` — today the
receiver logs `[skip] frameworks: unchanged` and delivers nothing.

## Scope

- In: delta logic in `scripts/ctx-receive.mjs`; a zero-dependency test script;
  a CI step running it in `.github/workflows/validate-skills.yml`; the header
  "Delta:" comment updated to describe the new rule.
- Out: docs-side refusal machinery (the receiver warns on intermediate drift —
  see Program design — but a hard check that `skill/` is regenerated belongs
  in docs CI); notifications (AX-138); consumer staleness monitoring (AX-143);
  the receive workflow's PR mechanics (`ctx-pipeline-receive.yml` is
  untouched); any content change under `skills/`.

## Plan

1. **Byte-diff delta in `scripts/ctx-receive.mjs`** — replace the
   `prev.sourceHash === sourceHash && prev.importerVersion === importerVersion`
   skip (currently line 112) with a tree comparison: a grouping is changed iff
   `agent-context/<grouping>/skill/**` differs from `skills/<skill>/**`
   (relative-path set + file bytes; missing destination = changed). Keep the
   mapping-drift name check, the provenance state write on import, `--dry-run`
   behavior, and the `GITHUB_OUTPUT` contract (`changed`, `changed_count`)
   unchanged. Update the header comment.
   - Check: covered by the slice-2 test (hand-edited fixture reports
     `[import]`, not `[skip]`).
2. **Test script** — new `scripts/ctx-receive.test.mjs`, zero-dependency
   (node:assert, node:fs, temp dirs; Node 18+ built-ins only, matching the
   script it tests). Cases: first import; identical re-dispatch → no change
   reported and no import; hand edit to `skill/SKILL.md` +
   `skill/references/<file>.md` (the docs#801 shape) → import; `changed_count`
   written correctly to a fake `GITHUB_OUTPUT`. Wire `npm test` in
   package.json to run it.
   - Check: `npm test` exits 0.
3. **CI wiring** — run the test in `.github/workflows/validate-skills.yml`
   (a step or small job invoking `npm test`).
   - Check: `rg -c "npm test" .github/workflows/validate-skills.yml` ≥ 1.

## Program design

- New helper `treeDiffers(srcDir, destDir)` → boolean. Recursive
  relative-path listing (files only) of both trees; differ when the path sets
  differ, any file's bytes differ, or any file's executable bit differs (the
  only mode bit git tracks — `cpSync` copies modes, so the gate must see
  them). Missing `destDir`, or a `destDir` that exists but is not a directory
  → true (the import's `rmSync` + `cpSync` repairs it). Symlinks and other
  non-regular entries in either tree fail the run loudly — `cpSync` would
  copy them but the gate can't compare them, so they are declared
  unsupported rather than silently skipped.
- `changed` ⟺ `treeDiffers(...)`. The state entry (`sourceHash`,
  `docsCommit`, `affects`) is still written on import — provenance only,
  never consulted for skipping. `importerVersion` is removed (config, state,
  README): with a faithful byte copy there is no import logic whose change
  could alter output, and a forced re-import of identical bytes would only
  recreate the empty-commit failure.
- A grouping whose `skill/SKILL.md` is missing is skipped with a warning
  (same as a missing manifest) only when it has never been imported — no
  state entry and no `skills/<name>` on disk — so one not-yet-onboarded
  grouping does not block the other twelve. Otherwise the run fails: an
  upstream deletion must not leave a stale skill in place silently. (Review
  amendment, 2026-08-25: the first run made this check a hard `fail()`;
  narrowed the same day on local review.)
- `hashIntermediates(groupingDir)` → sha256 over `context.md` + `system.md`
  (the docs-side inputs the skill is generated from; `null` when neither
  exists), remembered per grouping as `intermediateHash` in `state.json`. When
  it moves while `skill/**` is byte-identical, the run prints `[warn]` (plus a
  `::warning` annotation under GitHub Actions), stores the new hash so the
  warning fires once per upstream change rather than every run, and imports
  nothing. A legacy entry with no `intermediateHash` is seeded silently —
  there is no baseline to compare against. Decision (2026-08-25, Sean): warn,
  never fail — this repo must not fail on no-ops, and the receiver can't tell
  "forgot to regenerate" from "regeneration was a no-op".
- Known accepted edge (document in the header comment): a regeneration whose
  output is byte-identical imports nothing and writes no state, so
  `state.json` provenance may lag the newest `source_hash`. Harmless — and it
  fixes a latent failure: today a re-import of identical bytes makes the
  workflow's `git commit` fail on an empty stage. After this change,
  `changed_count > 0` always implies a real git diff.

## Exemplars

- `scripts/ctx-receive.mjs` itself — zero-dep style, `fail()` conventions,
  comment density.

## Done-signal

- `npm test` exits 0 and the suite includes the hand-edit-propagates case,
  the identical-re-dispatch-no-op case, and the intermediate-drift-warns case.
- `rg -n "prev.sourceHash === sourceHash && prev.importerVersion" scripts/ctx-receive.mjs`
  → 0 hits. (Amended mid-run by the orchestrator: the original blunter grep —
  any `prev.sourceHash === sourceHash` — caught a benign log-only comparison
  that labels the hand-edit case in the `[import]` reason string; the skip
  decision itself must consult only `treeDiffers`, which the next check pins.)
- `rg -c "treeDiffers" scripts/ctx-receive.mjs` ≥ 2 (definition + the skip
  decision).
- `rg -c "npm test" .github/workflows/validate-skills.yml` ≥ 1.
- human-verify: after netlify/docs#801 merges, the next receive run's rolling
  sync PR contains the Next.js fetch-skew qualification.

## Audit lenses

- simplicity
- security

## Issue

AX-136 — https://linear.app/netlify/issue/AX-136/stage-2-receiver-silently-skips-hand-edited-upstream-skills

## Branch

seandavis/ax-136-stage-2-receiver-silently-skips-hand-edited-upstream-skills

## Guardrails

- Loop bound: 3 audit/fix rounds.
- End by opening a PR — ready if the completeness gate passes clean, draft
  otherwise; never merge or deploy.
- PR title must be semantic (`fix: …`) — this repo's CI lints PR titles.
- No Claude attribution on commits or the PR body.

## External dependencies

none
