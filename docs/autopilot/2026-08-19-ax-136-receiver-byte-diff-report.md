# AX-136 autopilot run report — 2026-08-20

Spec: `2026-08-19-ax-136-receiver-byte-diff.md`. Branch built unattended
(launched 3:02 AM); orchestrator judged, Sonnet developers wrote, Codex
audited read-only.

## Slices

1. `577e427` — byte-diff delta (`treeDiffers`) replaces the manifest-hash
   skip; import reasons now name the hand-edit shape. Developer also made the
   missing-`SKILL.md` check unconditional (previously only on the changed
   path) — judged in-scope: same failure surface, now deterministic.
2. `3472da7` — zero-dep test suite (5 tests incl. the docs#801 hand-edit
   shape), `npm test` wired.
3. `0fe8cdc` — `test-receiver` job in `validate-skills.yml`; PR paths trigger
   extended to the receiver scripts so the suite actually fires on
   receiver-only PRs.

## Spec amendment (orchestrator, mid-run)

The original done-signal grep (`prev.sourceHash === sourceHash` → 0 hits) was
too blunt: it caught a benign log-only comparison that labels the hand-edit
case. Amended to target the decision conjunction
(`… && prev.importerVersion` → 0 hits) plus `treeDiffers` ≥ 2. Rationale
recorded in the spec's Done-signal section.

## Audit rounds (bound: 3, used: 1)

- **Security (Codex):** clean, round 1.
- **Simplicity (Codex):** 3 low findings.
  - Import-reason ternary — accepted narrowed: label made factual
    (`surface differs, source_hash unchanged`) + legacy-state guard; the
    labeling itself kept deliberately (visibility is AX-136's point). Codex's
    claim that it "couples the decision to manifest state" was wrong — the
    decision is `treeDiffers` only.
  - Redundant `Set` in `treeDiffers` — accepted; elementwise sorted-array
    compare.
  - Fold `test-receiver` into `validate` job — **rejected**: separate job is
    a named status check, runs parallel to the validator's network download,
    keeps jobs single-purpose.
- Fix commit `5bfff01`; tests re-run green by orchestrator; follow-up
  simplicity pass clean.

## Completeness gate

- `npm test` → 5/5 pass (orchestrator-run).
- `rg "prev.sourceHash === sourceHash && prev.importerVersion"` → 0 hits.
- `rg -c "treeDiffers"` → 3 (≥ 2).
- `rg -c "npm test" .github/workflows/validate-skills.yml` → 2 (≥ 1).
- human-verify (for Sean) — **pending, needs a live run**: after
  netlify/docs#801 merges, the next receive run's rolling sync PR must contain
  the Next.js fetch-skew qualification.

All machine-checkable items met; the human-verify item above is the one
open item. No deferred findings beyond the rejected CI-job fold above.

## Iteration 1 — 2026-08-25 (PR review)

Input: domitriusclark's review on #115 (6 inline + 2 top-level) plus two
CodeRabbit findings. All validated against the branch head `f3cae6a`.

Dispositions:

- Fixed — null `docsCommit` crash (test pins the manifest fallback);
  missing `SKILL.md` warns and continues instead of failing the run; symlinks
  and other non-regular entries fail loudly, executable bit compared (the
  only mode bit git tracks); non-directory destination counts as changed and
  is replaced; `importerVersion` removed from script, config, state, README
  (with a faithful copy no bump can change output); tests isolated per
  fixture; CI path filter includes `package.json`, `setup-node` pinned at
  Node 18; README describes `state.json` as provenance. Commits `ace7e5f`,
  `a701fb9`, `e22e3b4`, `1d9ae10`, `eb3f515`.
- Moved — `lastImportedCommit` / `state_changed` had no consumer in this PR;
  the consumer is #110 (`ctx-receiver-monotonic`). Reverted out of #115
  (`1a0b93e`); the writer ships in #110 so that PR is self-contained.
- Spec amended first (Program design): symlink/exec-bit policy,
  `importerVersion` removal, warn-not-fail on missing `SKILL.md`.

Audit (round 1 of 3): security clean; simplicity 1 low (test-helper state
and unused returns) — accepted, fixed in `eb3f515`.

Post-push CodeRabbit (2, both accepted): `treeDiffers` short-circuited on a
missing destination before listing the source, so a first import could
still copy a symlink — source is now listed (and its root `lstat`ed) first,
two first-import tests added (`7ed6a67`); `test-receiver` gets an explicit
`contents: read` token (`ec61f34`). Tests 13/13.

## Iteration 2 — 2026-08-25 (local review)

Input: a local review of the branch (three findings) plus Sean's decision on
scope.

- Medium, fixed — a previously imported grouping losing `skill/SKILL.md`
  was skipped like an unonboarded one, leaving a stale skill on a green run.
  Skip now applies only when never imported (no state entry, no
  `skills/<name>`); otherwise the run fails. `55cfe8a`.
- High, scope — AX-136's done-when covers `context.md`/`system.md`, which the
  receiver never imports. Options put to Sean: narrow the issue + docs-side
  follow-up (my recommendation), broaden and fail, broaden and warn.
  **Decision: broaden and warn — this repo must not fail on no-ops.**
  `hashIntermediates()` (sha256 of the two files) is stored per grouping as
  `intermediateHash`; when it moves while `skill/` is byte-identical the run
  prints `[warn]` (+ `::warning::` on Actions) once per upstream change and
  imports nothing. Legacy entries seed silently. `6643f68`, `11b1738`,
  `b74cec5` (null — both intermediates deleted — counts as a move).
- #110's description said the ordering key was introduced here — rewritten.

Audit (round 2 of 3): security clean. Simplicity 2 medium — (1) warn-once
persistence is discarded by the workflow until #110's `state_changed` gate:
**rejected**, that gate is #110's by decision and the persistence is correct
the moment it lands, documented in code; (2) `if (prev && intermediateHash)`
ignored a hash→null transition: **accepted**, `b74cec5`.

Gate: `npm test` 22/22; old skip conjunction 0; `treeDiffers` 3; `npm test`
in CI 2. Human-verify item still pending.

Gate re-run: `npm test` 11/11; old skip conjunction 0 hits; `treeDiffers`
3; `npm test` in CI 2. Human-verify item unchanged (pending).
