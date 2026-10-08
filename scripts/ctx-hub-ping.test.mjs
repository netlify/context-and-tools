#!/usr/bin/env node
// ctx-hub-ping.test.mjs — zero-dependency test suite for scripts/ctx-hub-ping.mjs.
//
// Exercises the pure body builders and status mappings, the retry rule via an
// injected fetch (no network), and the inert dry run by running the script as
// a child process without its URL and key.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict).
//
// Usage: node scripts/ctx-hub-ping.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMMANDS, buildPing, checkHubUrl, importedCommitFrom, mapNpm, mapSite, publishFinishedBody, releaseCreatedBody, releasePrOpenedBody, runUrl, send, syncPrClosedBody } from './ctx-hub-ping.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ctx-hub-ping.mjs');
const RUN_URL = 'https://github.com/netlify/context-and-tools/actions/runs/123';

const BASE_ENV = {
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'netlify/context-and-tools',
  GITHUB_RUN_ID: '123',
};
const PR = { number: 138, headBranchName: 'release-please--branches--main', title: 'chore(main): release 1.6.0', labels: [] };
const prEnv = (pr = PR) => ({ ...BASE_ENV, PR_JSON: JSON.stringify(pr) });
const publishEnv = (over = {}) => ({
  ...BASE_ENV,
  TAG: 'v1.6.0',
  NPM_JOB_RESULT: 'success',
  NPM_OUTCOME: 'published',
  SITE_JOB_RESULT: 'success',
  ...over,
});

// ── bodies ──

test('runUrl: built from the three GitHub env vars', () => {
  assert.equal(runUrl(BASE_ENV), RUN_URL);
});

test('release-pr-opened: body carries run URL, number, branch and title', () => {
  assert.deepEqual(buildPing('release-pr-opened', prEnv()), {
    ok: true,
    path: '/api/pipeline/events/ct-release-pr-opened',
    body: { githubRunUrl: RUN_URL, prNumber: 138, branch: 'release-please--branches--main', title: 'chore(main): release 1.6.0' },
  });
});

test('release-created: body carries run URL and tag', () => {
  assert.deepEqual(buildPing('release-created', { ...BASE_ENV, TAG: 'v1.6.0' }), {
    ok: true,
    path: '/api/pipeline/events/ct-release-created',
    body: { githubRunUrl: RUN_URL, tag: 'v1.6.0' },
  });
});

test('publish-finished: body carries run URL, tag, npm and site', () => {
  assert.deepEqual(buildPing('publish-finished', publishEnv()), {
    ok: true,
    path: '/api/pipeline/events/ct-publish-finished',
    body: { githubRunUrl: RUN_URL, tag: 'v1.6.0', npm: 'published', site: 'passed' },
  });
});

// ── sync-pr-closed ──

const SHA = 'a'.repeat(20) + '0123456789'.repeat(2);
const state = (over = {}) => JSON.stringify({ lastImportedCommit: SHA, ...over });
const syncEnv = (over = {}) => ({ ...BASE_ENV, PR_NUMBER: '57', MERGED: 'true', GITHUB_RUN_ATTEMPT: '1', SYNC_STATE: state(), ...over });

test('sync-pr-closed: merged with a good state carries the 40-hex docsSha', () => {
  assert.equal(SHA.length, 40);
  assert.deepEqual(buildPing('sync-pr-closed', syncEnv()), {
    ok: true,
    path: '/api/pipeline/events/ct-sync-pr-closed',
    body: { githubRunUrl: RUN_URL, attempt: 1, prNumber: 57, merged: true, docsSha: SHA },
  });
});

test('sync-pr-closed: merged with a bad state has docsSha null', () => {
  const r = syncPrClosedBody(syncEnv({ SYNC_STATE: 'not json' }));
  assert.equal(r.ok, true);
  assert.equal(r.body.docsSha, null);
});

test('sync-pr-closed: not merged has docsSha null even with a good state', () => {
  const r = syncPrClosedBody(syncEnv({ MERGED: 'false' }));
  assert.equal(r.ok, true);
  assert.equal(r.body.merged, false);
  assert.equal(r.body.docsSha, null);
});

test('sync-pr-closed: a bad PR_NUMBER, MERGED or GITHUB_RUN_ATTEMPT is refused', () => {
  for (const PR_NUMBER of [undefined, '', '0', '-3', '1.5', '12a', ' 7', '1e3']) {
    assert.equal(syncPrClosedBody(syncEnv({ PR_NUMBER })).ok, false, `PR_NUMBER ${PR_NUMBER}`);
  }
  for (const MERGED of [undefined, '', 'yes', 'True', 'TRUE', '1', ' true']) {
    assert.equal(syncPrClosedBody(syncEnv({ MERGED })).ok, false, `MERGED ${MERGED}`);
  }
  for (const GITHUB_RUN_ATTEMPT of [undefined, '', '0', '-1', '1.5', 'x']) {
    assert.equal(syncPrClosedBody(syncEnv({ GITHUB_RUN_ATTEMPT })).ok, false, `GITHUB_RUN_ATTEMPT ${GITHUB_RUN_ATTEMPT}`);
  }
  assert.equal(syncPrClosedBody({ ...syncEnv(), GITHUB_RUN_ID: 'abc' }).ok, false);
});

test('importedCommitFrom: every row', () => {
  const rows = [
    [state(), SHA],
    [JSON.stringify({ lastImportedCommit: SHA, other: 1 }), SHA],
    [state({ lastImportedCommit: SHA.slice(1) }), null],
    [state({ lastImportedCommit: SHA + 'a' }), null],
    [state({ lastImportedCommit: SHA.toUpperCase() }), null],
    [state({ lastImportedCommit: 12 }), null],
    [state({ lastImportedCommit: null }), null],
    ['{}', null],
    ['null', null],
    ['[]', null],
    ['"str"', null],
    ['42', null],
    ['not json', null],
    ['', null],
    [undefined, null],
  ];
  for (const [text, want] of rows) assert.equal(importedCommitFrom(text), want, String(text));
});

// ── mappings ──

test('mapNpm: every row', () => {
  const rows = [
    ['success', 'published', 'published'],
    ['success', 'already_published', 'already_published'],
    ['success', '', 'failed'],
    ['success', undefined, 'failed'],
    ['success', 'something-else', 'failed'],
    ['skipped', '', 'not_run'],
    ['skipped', 'published', 'not_run'],
    ['failure', '', 'failed'],
    ['failure', 'published', 'failed'],
    ['cancelled', '', 'failed'],
    [undefined, undefined, 'failed'],
  ];
  for (const [job, outcome, want] of rows) assert.equal(mapNpm(job, outcome), want, `${job} / ${outcome}`);
});

test('mapSite: every row', () => {
  assert.equal(mapSite('success'), 'passed');
  assert.equal(mapSite('skipped'), 'not_run');
  assert.equal(mapSite('failure'), 'failed');
  assert.equal(mapSite('cancelled'), 'failed');
  assert.equal(mapSite(undefined), 'failed');
});

test('publish-finished: a successful npm job with no NPM_OUTCOME maps to failed', () => {
  const ping = buildPing('publish-finished', publishEnv({ NPM_OUTCOME: undefined }));
  assert.equal(ping.ok, true);
  assert.equal(ping.body.npm, 'failed');
});

test('publish-finished: skipped jobs map to not_run', () => {
  const ping = buildPing('publish-finished', publishEnv({ NPM_JOB_RESULT: 'skipped', NPM_OUTCOME: '', SITE_JOB_RESULT: 'skipped' }));
  assert.equal(ping.body.npm, 'not_run');
  assert.equal(ping.body.site, 'not_run');
});

// ── untrusted / invalid input ──

test('bad PR_JSON: not JSON, not an object, missing or bad fields all refuse', () => {
  const bad = [
    undefined,
    '',
    'not json',
    'null',
    '[1]',
    '"str"',
    JSON.stringify({ ...PR, number: 0 }),
    JSON.stringify({ ...PR, number: -3 }),
    JSON.stringify({ ...PR, number: 1.5 }),
    JSON.stringify({ ...PR, number: '138' }),
    JSON.stringify({ ...PR, headBranchName: undefined }),
    JSON.stringify({ ...PR, title: '' }),
    JSON.stringify({ ...PR, title: 'x'.repeat(257) }),
    JSON.stringify({ ...PR, title: 42 }),
  ];
  for (const PR_JSON of bad) {
    const r = releasePrOpenedBody({ ...BASE_ENV, PR_JSON });
    assert.equal(r.ok, false, String(PR_JSON));
    assert.equal(typeof r.error, 'string');
  }
});

test('PR_JSON title of exactly 256 chars is accepted; extra fields are ignored', () => {
  const r = releasePrOpenedBody(prEnv({ ...PR, title: 'x'.repeat(256), body: 'ignored' }));
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.body).sort(), ['branch', 'githubRunUrl', 'prNumber', 'title']);
});

test('a non-release-please branch is refused', () => {
  for (const headBranchName of ['main', 'feature/release-please--x', 'my-release-please--x']) {
    const r = releasePrOpenedBody(prEnv({ ...PR, headBranchName }));
    assert.equal(r.ok, false, headBranchName);
    assert.match(r.error, /release-please--/);
  }
});

test('a bad tag is refused for release-created and publish-finished', () => {
  for (const TAG of [undefined, '', '1.6.0', 'v1.6', 'v1.6.0-rc.1', 'v1.6.0\nx', ' v1.6.0', 'vx.y.z']) {
    assert.equal(releaseCreatedBody({ ...BASE_ENV, TAG }).ok, false, String(TAG));
    assert.equal(publishFinishedBody(publishEnv({ TAG })).ok, false, String(TAG));
  }
});

test('missing or malformed run URL inputs are refused', () => {
  const env = { TAG: 'v1.6.0' };
  assert.equal(releaseCreatedBody(env).ok, false);
  assert.equal(releaseCreatedBody({ ...BASE_ENV, TAG: 'v1.6.0', GITHUB_RUN_ID: 'abc' }).ok, false);
  assert.equal(releaseCreatedBody({ ...BASE_ENV, TAG: 'v1.6.0', GITHUB_REPOSITORY: '' }).ok, false);
});

test('unknown command is refused', () => {
  for (const command of ['nope', undefined, '', 'toString', '__proto__']) {
    const r = buildPing(command, BASE_ENV);
    assert.equal(r.ok, false, String(command));
    assert.match(r.error, /unknown command/);
  }
});

// ── send: retry rule ──

const res = (status) => ({ status });
function fakeFetch(...steps) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return res(step);
  };
  return { impl, calls };
}
const SEND = { url: 'https://hub.example', key: 'secret-key', path: COMMANDS['release-created'].path, body: { tag: 'v1.0.0' }, delays: [0, 0] };

test('send: 200 succeeds on the first attempt with the right request', async () => {
  const { impl, calls } = fakeFetch(200);
  assert.equal(await send({ ...SEND, fetchImpl: impl }), 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hub.example/api/pipeline/events/ct-release-created');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.authorization, 'Bearer secret-key');
  assert.equal(calls[0].init.headers['content-type'], 'application/json');
  assert.equal(calls[0].init.body, '{"tag":"v1.0.0"}');
  assert.ok(calls[0].init.signal, 'each attempt has a timeout signal');
});

test('send: a trailing slash on the hub URL does not double the path separator', async () => {
  for (const url of ['https://hub.example/', 'https://hub.example//']) {
    const { impl, calls } = fakeFetch(200);
    await send({ ...SEND, url, fetchImpl: impl });
    assert.equal(calls[0].url, 'https://hub.example/api/pipeline/events/ct-release-created', url);
  }
});

test('send: 5xx is retried twice, then fails after three attempts', async () => {
  const { impl, calls } = fakeFetch(503);
  await assert.rejects(send({ ...SEND, fetchImpl: impl }), /returned 503/);
  assert.equal(calls.length, 3);
});

test('send: a 5xx that recovers on retry succeeds', async () => {
  const { impl, calls } = fakeFetch(502, 200);
  assert.equal(await send({ ...SEND, fetchImpl: impl }), 200);
  assert.equal(calls.length, 2);
});

test('send: network errors are retried twice', async () => {
  const { impl, calls } = fakeFetch(new Error('ECONNRESET'));
  await assert.rejects(send({ ...SEND, fetchImpl: impl }), /ECONNRESET/);
  assert.equal(calls.length, 3);
  const flaky = fakeFetch(new Error('fetch failed'), 200);
  assert.equal(await send({ ...SEND, fetchImpl: flaky.impl }), 200);
});

test('send: 4xx is never retried', async () => {
  for (const status of [400, 401, 413, 415]) {
    const { impl, calls } = fakeFetch(status);
    await assert.rejects(send({ ...SEND, fetchImpl: impl }), new RegExp(String(status)));
    assert.equal(calls.length, 1, String(status));
  }
});

test('send: errors never contain the key or the Authorization header', async () => {
  for (const step of [401, 503, new Error('boom')]) {
    const { impl } = fakeFetch(step);
    await assert.rejects(send({ ...SEND, fetchImpl: impl }), (err) => {
      assert.doesNotMatch(err.message, /secret-key|Bearer|authorization/i);
      return true;
    });
  }
});

// ── main: dry run ──

function runScript(args, env) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
}

test('main: without URL and key the ping prints a dry run and exits 0', () => {
  const r = runScript(['release-created'], { ...BASE_ENV, TAG: 'v1.0.0' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.stdout.trim(),
    `hub-ping (dry-run): /api/pipeline/events/ct-release-created ${JSON.stringify({ githubRunUrl: 'https://github.com/netlify/context-and-tools/actions/runs/123', tag: 'v1.0.0' })}`,
  );
});

test('main: sync-pr-closed reads SYNC_STATE_FILE for the sha; a missing file still exits 0 with null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-hub-ping-'));
  try {
    const file = path.join(dir, 'state.json');
    fs.writeFileSync(file, state());
    const env = { ...BASE_ENV, PR_NUMBER: '57', MERGED: 'true', GITHUB_RUN_ATTEMPT: '2' };
    const dry = (body) => `hub-ping (dry-run): /api/pipeline/events/ct-sync-pr-closed ${JSON.stringify(body)}`;

    const good = runScript(['sync-pr-closed'], { ...env, SYNC_STATE_FILE: file });
    assert.equal(good.status, 0, good.stderr);
    assert.equal(good.stdout.trim(), dry({ githubRunUrl: RUN_URL, attempt: 2, prNumber: 57, merged: true, docsSha: SHA }));

    const missing = runScript(['sync-pr-closed'], { ...env, SYNC_STATE_FILE: path.join(dir, 'nope.json') });
    assert.equal(missing.status, 0, missing.stderr);
    assert.equal(missing.stdout.trim(), dry({ githubRunUrl: RUN_URL, attempt: 2, prNumber: 57, merged: true, docsSha: null }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main: URL set but key unset is still a dry run', () => {
  const r = runScript(['release-created'], { ...BASE_ENV, TAG: 'v1.0.0', CONTEXT_HUB_URL: 'https://hub.example' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^hub-ping \(dry-run\): /);
});

test('checkHubUrl: https and loopback http pass; other http and malformed are refused', () => {
  for (const ok of ['https://hub.example', 'http://localhost:8888', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
    assert.equal(checkHubUrl(ok).ok, true, ok);
  }
  for (const bad of ['http://hub.example', 'ftp://hub.example', 'not a url', '']) {
    const r = checkHubUrl(bad);
    assert.equal(r.ok, false, bad);
    assert.match(r.error, /CONTEXT_HUB_URL/);
  }
});

test('main: a non-https, non-loopback URL is refused before any request (exit 1, key not printed)', () => {
  for (const CONTEXT_HUB_URL of ['http://hub.example', 'not a url']) {
    const r = runScript(['release-created'], { ...BASE_ENV, TAG: 'v1.0.0', CONTEXT_HUB_URL, CONTEXT_HUB_PIPELINE_KEY: 'secret-key' });
    assert.equal(r.status, 1, CONTEXT_HUB_URL);
    assert.match(r.stderr, /CONTEXT_HUB_URL/);
    assert.doesNotMatch(r.stderr + r.stdout, /secret-key/);
  }
});

test('main: unknown command and invalid input exit 1 with a message on stderr', () => {
  const unknown = runScript(['bogus'], BASE_ENV);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown command/);
  const noCommand = runScript([], BASE_ENV);
  assert.equal(noCommand.status, 1);
  const badTag = runScript(['release-created'], { ...BASE_ENV, TAG: 'nope' });
  assert.equal(badTag.status, 1);
  assert.match(badTag.stderr, /TAG/);
  assert.equal(badTag.stdout, '');
});

// ── workflow shape (the workflow files read as text; no YAML library) ──

const WORKFLOWS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
const workflowText = (name) => fs.readFileSync(path.join(WORKFLOWS, name), 'utf8');

// Top-level jobs of a workflow: name → the job's text. A job starts at a
// two-space-indented `name:` line under `jobs:` and runs to the next one.
function jobsOf(yml) {
  const lines = yml.split('\n');
  const jobs = {};
  let current = null;
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^\S/.test(line)) break; // next top-level key
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) {
      current = m[1];
      jobs[current] = '';
    } else if (current) {
      jobs[current] += `${line}\n`;
    }
  }
  return jobs;
}

const RELEASE_JOBS = jobsOf(workflowText('release-please.yml'));

// Each job's `needs:` as a list of job names (inline `x`, `[x, y]`, or a block list).
function needsOf(jobText) {
  const inline = /^    needs:\s*(.+)$/m.exec(jobText);
  if (inline) return inline[1].replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  const block = /^    needs:\s*\n((?:      - .+\n)+)/m.exec(jobText);
  return block ? block[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
}

test('workflow shape: notify-hub and report exist, with the ctx-pipeline environment and continue-on-error', () => {
  for (const name of ['notify-hub', 'report']) {
    const job = RELEASE_JOBS[name];
    assert.ok(job, `${name} job exists`);
    assert.match(job, /^    environment: ctx-pipeline$/m, name);
    assert.match(job, /^    continue-on-error: true$/m, name);
    assert.match(job, /^    permissions:\n      contents: read$/m, name);
    assert.match(job, /persist-credentials: false/, name);
  }
});

test('workflow shape: no job needs notify-hub or report', () => {
  for (const [name, text] of Object.entries(RELEASE_JOBS)) {
    const needs = needsOf(text);
    assert.ok(!needs.includes('notify-hub') && !needs.includes('report'), `${name} needs ${needs}`);
  }
  assert.deepEqual(needsOf(RELEASE_JOBS.report), ['release-please', 'publish-npm', 'deploy-hosted']);
  assert.deepEqual(needsOf(RELEASE_JOBS['notify-hub']), ['release-please']);
});

test('workflow shape: report runs after success or failure of a created release, not after a cancel', () => {
  assert.match(
    RELEASE_JOBS.report,
    /^    if: \$\{\{ !cancelled\(\) && needs\.release-please\.outputs\.release_created == 'true' \}\}$/m,
  );
});

test('workflow shape: the npm step id and both result= lines exist', () => {
  const npmJob = RELEASE_JOBS['publish-npm'];
  assert.match(npmJob, /^ {8}id: npm$/m);
  assert.match(npmJob, /echo "result=already_published" >> "\$GITHUB_OUTPUT"/);
  assert.match(npmJob, /echo "result=published" >> "\$GITHUB_OUTPUT"/);
  assert.match(npmJob, /^ {6}result: \$\{\{ steps\.npm\.outputs\.result \}\}$/m);
});

test('workflow shape: every ping step runs scripts/ctx-hub-ping.mjs with a known command, inputs via env', () => {
  const pings = [];
  for (const line of workflowText('release-please.yml').split('\n')) {
    if (!line.includes('ctx-hub-ping.mjs')) continue;
    if (/^\s*#/.test(line)) continue;
    const m = /^ {8}run: node scripts\/ctx-hub-ping\.mjs (\S+)$/.exec(line);
    assert.ok(m, `ping step is a plain run line: ${line}`);
    pings.push(m[1]);
  }
  assert.deepEqual(pings.sort(), ['publish-finished', 'release-created', 'release-pr-opened']);
  for (const command of pings) assert.ok(Object.hasOwn(COMMANDS, command), command);
});

test('workflow shape: the release-created ping still runs after a failed release-PR ping', () => {
  const step = /- name: Ping context-hub \(release created\)\n\s+if: (.+)\n/.exec(RELEASE_JOBS['notify-hub']);
  assert.ok(step, 'release-created step has an if');
  assert.match(step[1], /!cancelled\(\)/);
});

test('workflow shape: ping steps take the key and URL from env, and never interpolate into run text', () => {
  for (const name of ['notify-hub', 'report']) {
    const text = RELEASE_JOBS[name];
    assert.match(text, /CONTEXT_HUB_URL: \$\{\{ vars\.CONTEXT_HUB_URL \}\}/);
    assert.match(text, /CONTEXT_HUB_PIPELINE_KEY: \$\{\{ secrets\.CONTEXT_HUB_PIPELINE_KEY \}\}/);
    for (const line of text.split('\n')) if (/^\s*run:/.test(line)) assert.doesNotMatch(line, /\$\{\{/, line);
  }
});

// ── sync-closed workflow shape ──

const SYNC_TEXT = workflowText('ctx-pipeline-sync-closed.yml');
const SYNC_JOB = jobsOf(SYNC_TEXT).report;

test('workflow shape: sync-closed triggers only on pull_request_target closed, on main', () => {
  const on = /^on:\n((?:  .*\n|\s*\n)+)/m.exec(SYNC_TEXT);
  assert.ok(on, 'on: block exists');
  assert.equal(on[1].trimEnd(), '  pull_request_target:\n    types: [closed]\n    branches: [main]');
});

test('workflow shape: sync-closed job is gated on the sync branch and this repository', () => {
  assert.ok(SYNC_JOB, 'report job exists');
  const gate = /^    if: >\n((?:      .+\n)+)/m.exec(SYNC_JOB);
  assert.ok(gate, 'job has an if');
  assert.match(gate[1], /github\.event\.pull_request\.head\.ref == 'ctx-pipeline\/agent-context-sync'/);
  assert.match(gate[1], /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
});

test('workflow shape: sync-closed has the environment, continue-on-error, and read-only permissions', () => {
  assert.match(SYNC_JOB, /^    environment: ctx-pipeline$/m);
  assert.match(SYNC_JOB, /^    continue-on-error: true$/m);
  assert.match(SYNC_JOB, /^    permissions:\n      contents: read$/m);
  assert.doesNotMatch(SYNC_TEXT, /^\s*[a-z-]+: write$/m);
});

test('workflow shape: sync-closed never checks out or references the PR head', () => {
  assert.match(SYNC_TEXT, /actions\/checkout@[0-9a-f]{40}\n\s+with:\n\s+persist-credentials: false/);
  for (const line of SYNC_TEXT.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    if (/^\s*ref:/.test(line)) assert.fail(`no ref: input allowed: ${line}`);
  }
  // head.* appears only in the job's if: block
  const outsideIf = SYNC_TEXT.replace(/^    if: >\n(?:      .+\n)+/m, '');
  const code = outsideIf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.doesNotMatch(code, /\.head\b/);
});

test('workflow shape: sync-closed run lines never interpolate; the key reaches the step only via env from secrets', () => {
  const lines = SYNC_TEXT.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)run:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    assert.doesNotMatch(m[2], /\$\{\{/, lines[i]);
    if (m[2] === '|') {
      for (let j = i + 1; j < lines.length && (lines[j] === '' || lines[j].startsWith(`${m[1]}  `)); j++) {
        assert.doesNotMatch(lines[j], /\$\{\{/, lines[j]);
      }
    }
  }
  const keyLines = SYNC_TEXT.split('\n').filter((l) => l.includes('CONTEXT_HUB_PIPELINE_KEY') && !/^\s*#/.test(l));
  assert.deepEqual(keyLines.map((l) => l.trim()), ['CONTEXT_HUB_PIPELINE_KEY: ${{ secrets.CONTEXT_HUB_PIPELINE_KEY }}']);
  assert.match(SYNC_JOB, /CONTEXT_HUB_URL: \$\{\{ vars\.CONTEXT_HUB_URL \}\}/);
});

test('workflow shape: sync-closed ping step runs the sync-pr-closed command', () => {
  assert.match(SYNC_JOB, /^ {8}run: node scripts\/ctx-hub-ping\.mjs sync-pr-closed$/m);
  assert.ok(Object.hasOwn(COMMANDS, 'sync-pr-closed'));
});
