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

Gate re-run: `npm test` 11/11; old skip conjunction 0 hits; `treeDiffers`
3; `npm test` in CI 2. Human-verify item unchanged (pending).
