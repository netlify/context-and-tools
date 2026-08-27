#!/usr/bin/env node
// ctx-receive-ordering.test.mjs — zero-dependency tests for the ordering
// authority written by scripts/ctx-receive.mjs (`lastImportedCommit` in
// state.json) and the `state_changed` output the workflow gates its commit on.
//
// Builds a throwaway docs checkout with one grouping (`widgets` →
// `netlify-widgets`) and a target repo with config + empty state, then runs the
// receiver as a child process and asserts on state.json, stdout/stderr, and the
// GITHUB_OUTPUT contract. Each case builds its own fixture and removes it.
//
// Covers: first import writes the key; a same-commit re-dispatch is a byte-level
// no-op; a newer-commit re-dispatch advances the key while per-grouping
// provenance lags; no --docs-commit leaves the key unwritten; --dry-run writes
// nothing; a grouping named after the key is rejected.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict, node:child_process).
//
// Usage: node scripts/ctx-receive-ordering.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'ctx-receive.mjs');

const COMMIT_A = 'a'.repeat(40);
const COMMIT_B = 'b'.repeat(40);
const MANIFEST_COMMIT = 'c'.repeat(40);

// Fake docs checkout + fake target repo. `grouping` is the config-side name so
// the reserved-key collision case can override it.
function makeFixture({ grouping = 'widgets' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-receive-ordering-'));
  const docs = path.join(root, 'docs');
  const repo = path.join(root, 'repo');

  const groupingDir = path.join(docs, 'agent-context', 'widgets');
  fs.mkdirSync(path.join(groupingDir, 'skill'), { recursive: true });
  fs.writeFileSync(
    path.join(groupingDir, 'manifest.json'),
    JSON.stringify(
      {
        generation: { source_hash: 'deadbeefdeadbeefdeadbeef' },
        generated_from: { commit: MANIFEST_COMMIT },
        changes: [{ affects: ['skill'] }],
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    path.join(groupingDir, 'skill', 'SKILL.md'),
    '---\nname: netlify-widgets\ndescription: Widgets.\n---\n\n# Widgets\n',
  );

  fs.mkdirSync(path.join(repo, '.ctx-gen'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'skills'), { recursive: true });
  const config = path.join(repo, '.ctx-gen', 'config.json');
  const state = path.join(repo, '.ctx-gen', 'state.json');
  fs.writeFileSync(
    config,
    JSON.stringify({ groupings: [{ grouping, skill: 'netlify-widgets' }] }, null, 2) + '\n',
  );
  fs.writeFileSync(state, '{}\n');

  return {
    root,
    docs,
    config,
    state,
    skillsDir: path.join(repo, 'skills'),
    readState: () => JSON.parse(fs.readFileSync(state, 'utf8')),
    stateBytes: () => fs.readFileSync(state, 'utf8'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

// Run the receiver against a fixture with a fresh GITHUB_OUTPUT per run.
function runReceive(fx, ...extra) {
  const outputPath = path.join(fx.root, `github-output-${Date.now()}-${Math.random()}`);
  fs.writeFileSync(outputPath, '');
  const res = spawnSync(
    process.execPath,
    [
      SCRIPT,
      '--docs', fx.docs,
      '--config', fx.config,
      '--state', fx.state,
      '--skills-dir', fx.skillsDir,
      ...extra,
    ],
    { encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: outputPath } },
  );
  return { ...res, output: fs.readFileSync(outputPath, 'utf8') };
}

function withFixture(opts, fn) {
  const fx = makeFixture(opts);
  try {
    fn(fx);
  } finally {
    fx.cleanup();
  }
}

test('first import writes the ordering key and reports state_changed', () => {
  withFixture({}, (fx) => {
    const r = runReceive(fx, '--docs-commit', COMMIT_A);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.output, 'changed=widgets\nchanged_count=1\nstate_changed=true\n');
    const state = fx.readState();
    assert.equal(state.lastImportedCommit, COMMIT_A);
    assert.equal(state.widgets.docsCommit, COMMIT_A);
    assert.ok(fs.existsSync(path.join(fx.skillsDir, 'netlify-widgets', 'SKILL.md')));
  });
});

test('identical re-dispatch at the same commit is a byte-level no-op', () => {
  withFixture({}, (fx) => {
    runReceive(fx, '--docs-commit', COMMIT_A);
    const before = fx.stateBytes();
    const r = runReceive(fx, '--docs-commit', COMMIT_A);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.output, 'changed=\nchanged_count=0\nstate_changed=false\n');
    assert.doesNotMatch(r.stdout, /State advanced to/);
    assert.equal(fx.stateBytes(), before);
  });
});

test('identical re-dispatch at a newer commit advances the key; provenance lags', () => {
  withFixture({}, (fx) => {
    runReceive(fx, '--docs-commit', COMMIT_A);
    const r = runReceive(fx, '--docs-commit', COMMIT_B);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.output, 'changed=\nchanged_count=0\nstate_changed=true\n');
    assert.match(r.stdout, /State advanced to/);
    const state = fx.readState();
    assert.equal(state.lastImportedCommit, COMMIT_B);
    // Per-grouping entries are a provenance log: nothing imported, nothing written.
    assert.equal(state.widgets.docsCommit, COMMIT_A);
  });
});

test('no --docs-commit: imports without writing the ordering key', () => {
  withFixture({}, (fx) => {
    const r = runReceive(fx);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.output, 'changed=widgets\nchanged_count=1\nstate_changed=true\n');
    const state = fx.readState();
    assert.equal('lastImportedCommit' in state, false);
    // Provenance still falls back to the manifest; only the ordering key needs
    // an explicitly supplied commit.
    assert.equal(state.widgets.docsCommit, MANIFEST_COMMIT);
  });
});

test('--dry-run at a newer commit writes nothing and reports state_changed=false', () => {
  withFixture({}, (fx) => {
    runReceive(fx, '--docs-commit', COMMIT_A);
    const before = fx.stateBytes();
    const r = runReceive(fx, '--dry-run', '--docs-commit', COMMIT_B);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.output, 'changed=\nchanged_count=0\nstate_changed=false\n');
    assert.equal(fx.stateBytes(), before);
    assert.equal(fx.readState().lastImportedCommit, COMMIT_A);
  });
});

test('a grouping named after the ordering key is rejected', () => {
  withFixture({ grouping: 'lastImportedCommit' }, (fx) => {
    const r = runReceive(fx, '--docs-commit', COMMIT_A);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /reserved/);
    assert.equal(r.output, '');
    assert.equal(fx.stateBytes(), '{}\n');
  });
});
