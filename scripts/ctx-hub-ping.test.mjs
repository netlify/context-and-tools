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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMMANDS, buildPing, checkHubUrl, mapNpm, mapSite, publishFinishedBody, releaseCreatedBody, releasePrOpenedBody, runUrl, send } from './ctx-hub-ping.mjs';

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
const PUBLISH_JOBS = jobsOf(workflowText('publish.yml'));

// Each job's `needs:` as a list of job names (inline `x`, `[x, y]`, or a block list).
function needsOf(jobText) {
  const inline = /^    needs:\s*(.+)$/m.exec(jobText);
  if (inline) return inline[1].replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  const block = /^    needs:\s*\n((?:      - .+\n)+)/m.exec(jobText);
  return block ? block[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
}

test('workflow shape: notify-hub and report exist, with the ctx-pipeline environment and continue-on-error', () => {
  for (const [jobs, name] of [[RELEASE_JOBS, 'notify-hub'], [PUBLISH_JOBS, 'report']]) {
    assert.ok(jobs[name], `${name} job exists`);
    assert.match(jobs[name], /^    environment: ctx-pipeline$/m, name);
    assert.match(jobs[name], /^    continue-on-error: true$/m, name);
    assert.match(jobs[name], /^    permissions:\n      contents: read$/m, name);
    assert.match(jobs[name], /persist-credentials: false/, name);
  }
});

test('workflow shape: no job needs notify-hub or report', () => {
  for (const jobs of [RELEASE_JOBS, PUBLISH_JOBS]) {
    for (const [name, text] of Object.entries(jobs)) {
      const needs = needsOf(text);
      assert.ok(!needs.includes('notify-hub') && !needs.includes('report'), `${name} needs ${needs}`);
    }
  }
  assert.deepEqual(needsOf(PUBLISH_JOBS.report), ['publish-npm', 'deploy-hosted']);
  assert.deepEqual(needsOf(RELEASE_JOBS['notify-hub']), ['release-please']);
});

test('workflow shape: report runs always', () => {
  assert.match(PUBLISH_JOBS.report, /^    if: \$\{\{ always\(\) \}\}$/m);
});

test('workflow shape: the npm step id and both result= lines exist', () => {
  const yml = workflowText('publish.yml');
  assert.match(yml, /^ {8}id: npm$/m);
  assert.match(yml, /echo "result=already_published" >> "\$GITHUB_OUTPUT"/);
  assert.match(yml, /echo "result=published" >> "\$GITHUB_OUTPUT"/);
  assert.match(PUBLISH_JOBS['publish-npm'], /^ {4}outputs:\n {6}result: \$\{\{ steps\.npm\.outputs\.result \}\}$/m);
});

test('workflow shape: every ping step runs scripts/ctx-hub-ping.mjs with a known command, inputs via env', () => {
  const pings = [];
  for (const yml of [workflowText('release-please.yml'), workflowText('publish.yml')]) {
    for (const line of yml.split('\n')) {
      if (!line.includes('ctx-hub-ping.mjs')) continue;
      if (/^\s*#/.test(line)) continue;
      const m = /^ {8}run: node scripts\/ctx-hub-ping\.mjs (\S+)$/.exec(line);
      assert.ok(m, `ping step is a plain run line: ${line}`);
      pings.push(m[1]);
    }
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
  for (const jobs of [RELEASE_JOBS, PUBLISH_JOBS]) {
    for (const name of ['notify-hub', 'report']) {
      const text = jobs[name];
      if (!text) continue;
      assert.match(text, /CONTEXT_HUB_URL: \$\{\{ vars\.CONTEXT_HUB_URL \}\}/);
      assert.match(text, /CONTEXT_HUB_PIPELINE_KEY: \$\{\{ secrets\.CONTEXT_HUB_PIPELINE_KEY \}\}/);
      for (const line of text.split('\n')) if (/^\s*run:/.test(line)) assert.doesNotMatch(line, /\$\{\{/, line);
    }
  }
});
