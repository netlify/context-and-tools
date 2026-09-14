#!/usr/bin/env node
// ctx-notify.test.mjs — zero-dependency test suite for scripts/ctx-notify.mjs.
//
// Exercises the pure classification and formatting layer (everything above
// the I/O line) against run/jobs fixtures shaped like the GitHub Actions API
// responses the watcher reads. Each shape in the header's table has a case,
// plus the degradation rules: a missing outcome artifact must never change
// the shape (only the docs sha / groupings / PR fields), and anything
// unrecognized must land on ⚠️ rather than a confident guess.
//
// Zero dependencies, Node 18+ (node:test, node:assert/strict).
//
// Usage: node scripts/ctx-notify.test.mjs   (also wired as `npm test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RECEIVE_WORKFLOW,
  STEP,
  TRUSTED_EVENTS,
  classifyRun,
  formatMessage,
  outcomeForAttempt,
  parseOutcome,
  stripMarkup,
  untrustedReason,
} from './ctx-notify.mjs';

const WORKFLOWS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');
const RECEIVE_YML = fs.readFileSync(path.join(WORKFLOWS, 'ctx-pipeline-receive.yml'), 'utf8');
const NOTIFY_YML = fs.readFileSync(path.join(WORKFLOWS, 'ctx-pipeline-notify.yml'), 'utf8');

// Step names are read from the receive workflow itself, not copied by hand,
// so a rename there fails here. The jobs API wraps them in the two runner
// steps; the classifier never looks at those.
const WORKFLOW_STEPS = RECEIVE_YML.split('\n')
  .filter((l) => /^      - name: /.test(l))
  .map((l) => l.replace(/^      - name: /, '').trim());
const STEPS = ['Set up job', ...WORKFLOW_STEPS, 'Complete job'];

// Build a receive job where every step is green except those named in
// `overrides` (step name → conclusion). Steps after the first failure are
// skipped, as Actions reports them.
function receiveJob(overrides = {}) {
  let failed = false;
  const steps = STEPS.map((name) => {
    if (name in overrides) {
      if (overrides[name] === 'failure') failed = true;
      return { name, conclusion: overrides[name] };
    }
    if (failed && !name.startsWith('Record') && !name.startsWith('Upload') && name !== 'Complete job')
      return { name, conclusion: 'skipped' };
    return { name, conclusion: 'success' };
  });
  return { name: 'receive', conclusion: failed ? 'failure' : 'success', steps };
}

function run(overrides = {}) {
  return {
    name: RECEIVE_WORKFLOW,
    conclusion: 'success',
    id: 32073913019,
    html_url: 'https://github.com/netlify/context-and-tools/actions/runs/32073913019',
    event: 'repository_dispatch',
    run_attempt: 1,
    ...overrides,
  };
}

const DOCS_SHA = 'e33a7260cd1ab02c53b80420d047044454a29833';
const OUTCOME = {
  docs_ref: DOCS_SHA,
  docs_sha: DOCS_SHA,
  guard_skip: '0',
  guard_bypassed: 'false',
  changed: 'functions,forms',
  changed_count: '2',
  state_changed: 'true',
  pr_url: 'https://github.com/netlify/context-and-tools/pull/123',
  run_attempt: '1',
};
const OUTCOME_WITH_ATTEMPT_2 = { ...OUTCOME, run_attempt: '2' };

// ── coupling to the workflows: names the classifier keys on must exist ──

test('every STEP prefix matches exactly one step in ctx-pipeline-receive.yml', () => {
  assert.ok(WORKFLOW_STEPS.length >= 5, 'parsed too few steps from the receive workflow');
  for (const [key, prefix] of Object.entries(STEP)) {
    const hits = WORKFLOW_STEPS.filter((s) => s.startsWith(prefix));
    assert.equal(hits.length, 1, `STEP.${key} (${JSON.stringify(prefix)}) matched ${hits.length} steps: ${JSON.stringify(hits)}`);
  }
});

test('the receive workflow name and the notify trigger both equal RECEIVE_WORKFLOW', () => {
  assert.match(RECEIVE_YML, new RegExp(`^name: ${RECEIVE_WORKFLOW}$`, 'm'));
  assert.match(NOTIFY_YML, new RegExp(`workflows: \\["${RECEIVE_WORKFLOW}"\\]`));
});

test('the receive workflow has no triggers beyond TRUSTED_EVENTS', () => {
  const on = RECEIVE_YML.slice(RECEIVE_YML.indexOf('\non:\n') + 5, RECEIVE_YML.indexOf('\npermissions:'));
  const triggers = on.split('\n').filter((l) => /^  \w/.test(l)).map((l) => l.trim().replace(/:$/, ''));
  assert.deepEqual(triggers.sort(), [...TRUSTED_EVENTS].sort());
});

// ── trust boundary ──

test('untrustedReason: same-repo dispatch runs pass; forks and other events are refused', () => {
  const repo = 'netlify/context-and-tools';
  const ok = { event: 'repository_dispatch', head_repository: { full_name: repo } };
  assert.equal(untrustedReason(ok, repo), null);
  assert.equal(untrustedReason({ ...ok, event: 'workflow_dispatch' }, repo), null);
  assert.match(untrustedReason({ ...ok, head_repository: { full_name: 'attacker/context-and-tools' } }, repo), /attacker\/context-and-tools.*fork/);
  assert.match(untrustedReason({ ...ok, head_repository: undefined }, repo), /unknown repository/);
  assert.match(untrustedReason({ ...ok, event: 'pull_request' }, repo), /pull_request/);
  assert.match(untrustedReason({ ...ok, event: 'push' }, repo), /push/);
});

test('outcomeForAttempt: the artifact only counts for the attempt that wrote it', () => {
  const r = run({ run_attempt: 2 });
  assert.deepEqual(outcomeForAttempt({ ...OUTCOME, run_attempt: '2' }, r), OUTCOME_WITH_ATTEMPT_2);
  assert.equal(outcomeForAttempt({ ...OUTCOME, run_attempt: '1' }, r), null);
  assert.equal(outcomeForAttempt({ ...OUTCOME }, r), null, 'an artifact without run_attempt predates the check and is not trusted');
  assert.equal(outcomeForAttempt(null, r), null);
});

// ── shapes ──

test('imported: PR step green → 📥 with groupings; the PR URL rides on its own line', () => {
  const cls = classifyRun(run(), [receiveJob()], OUTCOME);
  assert.equal(cls.shape, 'imported');
  assert.equal(cls.detail, 'groupings: functions forms');
  const msg = formatMessage(cls, run(), OUTCOME);
  assert.equal(msg.split('\n').pop(), 'PR: https://github.com/netlify/context-and-tools/pull/123');
});

test('imported: ordering-only advance names itself rather than listing groupings', () => {
  const cls = classifyRun(run(), [receiveJob()], { ...OUTCOME, changed: '', changed_count: '0' });
  assert.equal(cls.shape, 'imported');
  assert.match(cls.detail, /ordering advanced only/);
});

test('imported: no outcome artifact degrades the detail, not the shape', () => {
  const cls = classifyRun(run(), [receiveJob()], null);
  assert.equal(cls.shape, 'imported');
  assert.match(cls.detail, /groupings unknown/);
  assert.doesNotMatch(formatMessage(cls, run(), null), /^PR:/m);
});

test('noop: import green, PR skipped → 💤', () => {
  const jobs = [receiveJob({ 'Open or update the rolling sync PR': 'skipped' })];
  const cls = classifyRun(run(), jobs, { ...OUTCOME, changed: '', changed_count: '0', state_changed: 'false', pr_url: '' });
  assert.equal(cls.shape, 'noop');
});

test('stale: guard green, import skipped → ⏭️ SKIPPED, not NO-OP', () => {
  const jobs = [receiveJob({ 'Import changed skills': 'skipped', 'Open or update the rolling sync PR': 'skipped' })];
  const cls = classifyRun(run(), jobs, { ...OUTCOME, guard_skip: '1', changed: '', changed_count: '' });
  assert.equal(cls.shape, 'stale');
  assert.match(cls.detail, /AX-159/);
});

test('skipped run (CTX_PIPELINE off) posts nothing', () => {
  assert.equal(classifyRun(run({ conclusion: 'skipped' }), [], null), null);
  assert.equal(formatMessage(null, run()), null);
});

// ── failures: each known step gets an actionable line ──

test('red: guard failed closed names skip_guard as the recovery', () => {
  const jobs = [receiveJob({ 'Monotonicity guard': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, OUTCOME);
  assert.equal(cls.shape, 'red');
  assert.match(cls.detail, /monotonicity guard failed closed/);
  assert.match(cls.detail, /skip_guard/);
  assert.match(cls.detail, /Every later dispatch fails the same way/);
});

test('red: preflight failure points at the two secrets', () => {
  const jobs = [receiveJob({ 'Preflight — required secrets': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, null);
  assert.equal(cls.shape, 'red');
  assert.match(cls.detail, /DOCS_READ_TOKEN/);
  assert.match(cls.detail, /CTX_PIPELINE_PR_TOKEN/);
});

test('red: docs checkout failure carries the requested ref when known', () => {
  const jobs = [receiveJob({ 'Checkout netlify/docs at ref': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, { docs_ref: 'deadbeef' });
  assert.equal(cls.shape, 'red');
  assert.match(cls.detail, /netlify\/docs at deadbeef/);
  const bare = classifyRun(run({ conclusion: 'failure' }), jobs, null);
  assert.match(bare.detail, /at the requested ref/);
  // docs_ref echoes the dispatch payload: Slack markup must not survive.
  const hostile = classifyRun(run({ conclusion: 'failure' }), jobs, { docs_ref: '<!channel> ' + 'x'.repeat(100) });
  assert.doesNotMatch(hostile.detail, /[<>]/);
  assert.match(hostile.detail, /!channel x+…/);
});

test('red: import step failure points at the run log rather than guessing a cause', () => {
  const jobs = [receiveJob({ 'Import changed skills': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, OUTCOME);
  assert.equal(cls.shape, 'red');
  assert.match(cls.detail, /^import failed — ctx-receive exited non-zero/);
});

test('red: PR step failure says skills imported but PR not surfaced, with groupings', () => {
  const jobs = [receiveJob({ 'Open or update the rolling sync PR': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, OUTCOME);
  assert.equal(cls.shape, 'red');
  assert.match(cls.detail, /NOT pushed\/opened/);
  assert.match(cls.detail, /CTX_PIPELINE_PR_TOKEN/);
  assert.match(cls.detail, /groupings: functions forms/);
});

test('red: an unrecognized failing step is still named', () => {
  const jobs = [receiveJob({ 'Checkout context-and-tools': 'failure' })];
  const cls = classifyRun(run({ conclusion: 'failure' }), jobs, null);
  assert.equal(cls.shape, 'red');
  assert.equal(cls.detail, 'receive failed at "Checkout context-and-tools"');
});

test('red: failure with no failed step / no receive job is still red', () => {
  const noStep = classifyRun(run({ conclusion: 'failure' }), [{ name: 'receive', conclusion: 'failure', steps: [] }], null);
  assert.equal(noStep.shape, 'red');
  assert.match(noStep.detail, /no failed step/);
  const noJob = classifyRun(run({ conclusion: 'failure' }), [], null);
  assert.equal(noJob.shape, 'red');
  assert.match(noJob.detail, /no "receive" job/);
});

test('red: startup_failure is red, not unclassified', () => {
  const cls = classifyRun(run({ conclusion: 'startup_failure' }), [], null);
  assert.equal(cls.shape, 'red');
});

// ── unclassified: never guess ──

test('unclassified: cancelled / timed_out / unknown conclusion / unknown workflow', () => {
  for (const conclusion of ['cancelled', 'timed_out']) {
    const cls = classifyRun(run({ conclusion }), [receiveJob()], null);
    assert.equal(cls.shape, 'unclassified', conclusion);
    assert.match(cls.detail, new RegExp(conclusion));
  }
  assert.equal(classifyRun(run({ conclusion: 'action_required' }), [], null).shape, 'unclassified');
  const other = classifyRun(run({ name: 'Validate Skills' }), [], null);
  assert.equal(other.shape, 'unclassified');
  assert.match(other.detail, /unknown workflow "Validate Skills"/);
});

test('unclassified: green run with a step layout the classifier does not know', () => {
  // Every interesting step skipped — not a shape the workflow can produce.
  const jobs = [receiveJob({ 'Monotonicity guard': 'skipped', 'Import changed skills': 'skipped', 'Open or update the rolling sync PR': 'skipped' })];
  assert.equal(classifyRun(run(), jobs, null).shape, 'unclassified');
  assert.equal(classifyRun(run(), [], null).shape, 'unclassified');
});

// ── message layout: status / docs+trigger / detail / run URL / PR URL ──

test('formatMessage: one field per line in contract order, docs sha shortened to 9, plain-text only', () => {
  const msg = formatMessage(classifyRun(run(), [receiveJob()], OUTCOME), run(), OUTCOME);
  assert.deepEqual(msg.split('\n'), [
    '📥 ctx-pipeline receive IMPORTED',
    `docs ${DOCS_SHA.slice(0, 9)} · dispatch`,
    'groupings: functions forms',
    'run: https://github.com/netlify/context-and-tools/actions/runs/32073913019',
    'PR: https://github.com/netlify/context-and-tools/pull/123',
  ]);
  // Workflow Builder renders the variable as plain text: no mrkdwn links, no entities.
  assert.doesNotMatch(msg, /[<>]|&amp;/);
});

test('formatMessage: a populated pr_url never produces a PR line on a non-imported shape', () => {
  const failed = run({ conclusion: 'failure' });
  const cases = [
    ['noop', run(), [receiveJob({ 'Open or update the rolling sync PR': 'skipped' })]],
    ['stale', run(), [receiveJob({ 'Import changed skills': 'skipped', 'Open or update the rolling sync PR': 'skipped' })]],
    ['red', failed, [receiveJob({ 'Open or update the rolling sync PR': 'failure' })]],
    ['unclassified', run({ conclusion: 'cancelled' }), [receiveJob()]],
  ];
  for (const [shape, r, jobs] of cases) {
    const cls = classifyRun(r, jobs, OUTCOME);
    assert.equal(cls.shape, shape);
    assert.doesNotMatch(formatMessage(cls, r, OUTCOME), /^PR:/m, shape);
  }
});

test('formatMessage: PR line requires a GitHub pull URL, not whatever the artifact says', () => {
  for (const bad of ['', 'not a url', 'https://example.com/pull/1', 'https://github.com/netlify/context-and-tools/pull/12 <!channel>']) {
    const msg = formatMessage(classifyRun(run(), [receiveJob()], { ...OUTCOME, pr_url: bad }), run(), { ...OUTCOME, pr_url: bad });
    assert.doesNotMatch(msg, /^PR:/m, JSON.stringify(bad));
  }
});

test('formatMessage: docs n/a without an artifact; attempt number on re-runs; no PR line', () => {
  const r = run({ run_attempt: 2 });
  const lines = formatMessage(classifyRun(r, [receiveJob()], null), r, null).split('\n');
  assert.equal(lines[1], 'docs n/a · dispatch (attempt 2)');
  assert.equal(lines.length, 4);
});

test('formatMessage: manual runs say so, and skip_guard bypasses are flagged', () => {
  const r = run({ event: 'workflow_dispatch' });
  assert.equal(formatMessage(classifyRun(r, [receiveJob()], OUTCOME), r, OUTCOME).split('\n')[1], `docs ${DOCS_SHA.slice(0, 9)} · manual`);
  const bypass = { ...OUTCOME, guard_bypassed: 'true' };
  assert.equal(formatMessage(classifyRun(r, [receiveJob()], bypass), r, bypass).split('\n')[1], `docs ${DOCS_SHA.slice(0, 9)} · manual (skip_guard)`);
});

test('formatMessage: detail is capped at 300 chars', () => {
  const msg = formatMessage({ shape: 'red', detail: 'x'.repeat(500) }, run(), null);
  const detail = msg.split('\n')[2];
  assert.equal(detail.length, 300);
  assert.ok(detail.endsWith('…'));
});

// ── helpers ──

test('parseOutcome: object passes; garbage, arrays and null are absent', () => {
  assert.deepEqual(parseOutcome('{"docs_sha":"abc"}'), { docs_sha: 'abc' });
  assert.equal(parseOutcome('not json'), null);
  assert.equal(parseOutcome('[1]'), null);
  assert.equal(parseOutcome('null'), null);
});

test('stripMarkup removes angle brackets and leaves everything else alone', () => {
  assert.equal(stripMarkup('a<b>&c'), 'ab&c');
});
