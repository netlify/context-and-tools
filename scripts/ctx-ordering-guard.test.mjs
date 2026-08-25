#!/usr/bin/env node
// ctx-ordering-guard.test.mjs — zero-dependency test suite for
// scripts/ctx-ordering-guard.mjs.
//
// Builds a throwaway git repo standing in for the netlify/docs checkout
// (linear commits A → B, plus an unrelated root U), then runs the guard as a
// child process against state.json fixtures and asserts on exit status,
// stdout/stderr, and the GITHUB_OUTPUT contract.
//
// The fixture matrix mirrors the decision table in the guard's header:
// bootstrap (no file / no key / empty object) proceeds, descent proceeds,
// non-descent skips, and anything unvalidatable fails closed.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict, node:child_process;
// requires git on PATH, as in CI).
//
// Usage: node scripts/ctx-ordering-guard.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'ctx-ordering-guard.mjs');

function git(dir, ...args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
}

// One shared docs fixture: commit A, its descendant B, and U on an unrelated
// root (simulating rewritten history / a foreign branch).
function makeDocsRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-guard-docs-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.name', 'test');
  git(dir, 'config', 'user.email', 'test@example.com');

  fs.writeFileSync(path.join(dir, 'f.txt'), 'a\n');
  git(dir, 'add', 'f.txt');
  git(dir, 'commit', '-q', '-m', 'A');
  const a = git(dir, 'rev-parse', 'HEAD');

  fs.writeFileSync(path.join(dir, 'f.txt'), 'b\n');
  git(dir, 'commit', '-q', '-am', 'B');
  const b = git(dir, 'rev-parse', 'HEAD');

  git(dir, 'checkout', '-q', '--orphan', 'unrelated');
  fs.writeFileSync(path.join(dir, 'f.txt'), 'u\n');
  git(dir, 'add', 'f.txt');
  git(dir, 'commit', '-q', '-m', 'U');
  const u = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '-q', 'main');

  return { dir, a, b, u };
}

const docs = makeDocsRepo();

// Run the guard against a state fixture. `state` is the JSON value to write,
// the literal string to write raw, or undefined for "no state file".
function runGuard({ state, incoming }) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-guard-run-'));
  const statePath = path.join(workDir, 'state.json');
  if (typeof state === 'string') fs.writeFileSync(statePath, state);
  else if (state !== undefined) fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  const outputPath = path.join(workDir, 'github-output');
  fs.writeFileSync(outputPath, '');

  const res = spawnSync(
    process.execPath,
    [SCRIPT, '--docs', docs.dir, '--incoming', incoming, '--state', statePath],
    { encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: outputPath } },
  );
  return { ...res, output: fs.readFileSync(outputPath, 'utf8') };
}

test('bootstrap: no state file proceeds', () => {
  const r = runGuard({ incoming: docs.b });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bootstrap/);
  assert.equal(r.output, 'skip=0\n');
});

test('bootstrap: state without an ordering key proceeds (pre-key provenance, mixed docsCommit values)', () => {
  // The exact shape the old aggregate-the-groupings guard failed on forever:
  // two groupings recorded at different commits. With ordering read from the
  // top-level key only, this is bootstrap, not corruption.
  const r = runGuard({
    state: {
      functions: { sourceHash: 'x', docsCommit: docs.a },
      platform: { sourceHash: 'y', docsCommit: docs.b },
    },
    incoming: docs.b,
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /no lastImportedCommit/);
  assert.equal(r.output, 'skip=0\n');
});

test('bootstrap: empty state object proceeds', () => {
  const r = runGuard({ state: {}, incoming: docs.b });
  assert.equal(r.status, 0);
  assert.equal(r.output, 'skip=0\n');
});

test('proceed: incoming descends from last imported', () => {
  const r = runGuard({ state: { lastImportedCommit: docs.a }, incoming: docs.b });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /descends from last imported/);
  assert.equal(r.output, 'skip=0\n');
});

test('proceed: re-delivery of the last imported commit itself', () => {
  const r = runGuard({ state: { lastImportedCommit: docs.b }, incoming: docs.b });
  assert.equal(r.status, 0);
  assert.equal(r.output, 'skip=0\n');
});

test('skip: incoming is older than last imported', () => {
  const r = runGuard({ state: { lastImportedCommit: docs.b }, incoming: docs.a });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /does not descend from last imported/);
  assert.equal(r.output, 'skip=1\n');
});

test('skip: incoming is unrelated to last imported', () => {
  const r = runGuard({ state: { lastImportedCommit: docs.a }, incoming: docs.u });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /does not descend from last imported/);
  assert.equal(r.output, 'skip=1\n');
});

test('fail closed: ordering key is not a full SHA', () => {
  const r = runGuard({ state: { lastImportedCommit: docs.a.slice(0, 12) }, incoming: docs.b });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a full commit SHA/);
  assert.equal(r.output, '');
});

test('fail closed: ordering key is null', () => {
  const r = runGuard({ state: { lastImportedCommit: null }, incoming: docs.b });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a full commit SHA/);
});

test('fail closed: recorded commit is absent from the docs checkout', () => {
  const r = runGuard({ state: { lastImportedCommit: 'f'.repeat(40) }, incoming: docs.b });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not present in the docs checkout/);
  assert.equal(r.output, '');
});

test('fail closed: incoming commit is unresolvable (merge-base error branch)', () => {
  // cat-file -e only validates the recorded commit, so a bad --incoming
  // reaches merge-base and must land in the status!=0/1 fail-closed branch —
  // the silent-bypass shape this guard exists to prevent.
  const r = runGuard({ state: { lastImportedCommit: docs.a }, incoming: '0'.repeat(40) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /merge-base failed with status/);
  assert.equal(r.output, '');
});

test('fail closed: state is not valid JSON', () => {
  const r = runGuard({ state: 'not json{', incoming: docs.b });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not valid JSON/);
});

test('fail closed: state is a JSON array, not an object', () => {
  const r = runGuard({ state: '[1, 2]\n', incoming: docs.b });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a JSON object/);
});
