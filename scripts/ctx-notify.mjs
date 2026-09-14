#!/usr/bin/env node
// ctx-notify — classify a finished "Receive agent-context" run and post a
// short status to #notify-context-pipeline (EX-3057).
//
// Called by .github/workflows/ctx-pipeline-notify.yml (a workflow_run
// watcher). The docs-side notifier reports delivery when its dispatch is
// accepted; this one reports whether the import actually landed.
//
// One message per receive run, five shapes:
//   📥 IMPORTED      skills (or the ordering position) changed; the rolling
//                    sync PR was opened or updated
//   💤 NO-OP         docs commit imported cleanly, nothing changed
//   ⏭️ SKIPPED       stale delivery — the monotonicity guard refused an older
//                    docs commit (AX-159); self-heals on the next dispatch
//   🔴 FAILED        with the failing step and, where the step is known, what
//                    to do about it (the guard's fail-closed branch calls out
//                    the skip_guard recovery, because that state recurs on
//                    every later dispatch until a human resets it)
//   ⚠️ UNCLASSIFIED  cancelled / timed out / unrecognized job layout
// Runs with conclusion "skipped" (CTX_PIPELINE off) post nothing.
//
// Message layout, one field per line, in a fixed order so a reader can pair
// it with the docs-side line at a glance:
//   <emoji> ctx-pipeline receive <SHAPE>
//   docs <sha9|n/a> · <trigger>[ (attempt N)]
//   <detail>
//   run: <url>
//   PR: <url>            (only when the rolling PR was opened or updated)
// The docs sha is the correlation key: it matches the sha in the docs-side
// 📦 DELIVERED line for the same delivery.
//
// The channel's webhook is a Slack Workflow Builder trigger (EX-3065), which
// drops `text` into a template as PLAIN text: mrkdwn is not interpreted, so
// <url|label> links render as literal brackets and &amp; shows as-is. Bare
// URLs auto-link and newlines break lines, so the message uses only those.
// The one payload-derived field (docs_ref) has angle brackets stripped: moot
// in plain-text mode, and the right guard if the trigger ever becomes a
// classic incoming webhook that does parse mrkdwn.
//
// Trust boundary: workflow_run matches the watched workflow by NAME and fires
// for any completed run of that name, including one a fork PR produced by
// adding a pull_request trigger (or a same-named file) — and this watcher
// runs on main with the webhook secret. So only runs from this repository
// triggered by repository_dispatch or workflow_dispatch (the receive
// workflow's only legitimate triggers) are classified; anything else is
// refused before its steps or artifact are read. The notify workflow's job
// `if:` enforces the same rule so a foreign run never starts a runner.
//
// Classification reads GitHub's own job/step conclusions, so it works even
// for runs that die before checkout. The receive workflow additionally
// uploads a small `ctx-receive-outcome` artifact (docs sha, groupings, PR
// URL) that only enriches the message — its absence degrades to "docs n/a",
// never to a wrong shape. The artifact carries the run_attempt that wrote
// it; a re-run that dies before uploading leaves the previous attempt's file
// behind, and that one is ignored rather than attached to the new message.
// Anything unrecognized posts ⚠️ loudly rather than a confident guess.
//
// GitHub API reads and the Slack POST retry three times with backoff and a
// 10s timeout each. If Slack is still down after that the notify run goes
// red; a persistent Slack outage cannot be reported through Slack, and the
// red run is the floor (same as the docs side).
//
// Inert until SLACK_WEBHOOK_URL exists (ctx-pipeline environment): without it
// the message prints as a dry run and the step exits 0. A failed Slack POST
// exits 1 — the notify run goes red in Actions; the receive run itself is
// never touched.
//
// Zero dependencies, Node 18+.
//
// Usage:
//   node scripts/ctx-notify.mjs --run-id <id> [--repo owner/name] [--dry-run]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RECEIVE_WORKFLOW = 'Receive agent-context';
export const OUTCOME_ARTIFACT = 'ctx-receive-outcome';

const SHAPES = {
  imported: { emoji: '📥', label: 'IMPORTED' },
  noop: { emoji: '💤', label: 'NO-OP' },
  stale: { emoji: '⏭️', label: 'SKIPPED' },
  red: { emoji: '🔴', label: 'FAILED' },
  unclassified: { emoji: '⚠️', label: 'UNCLASSIFIED' },
};

// Step names as the receive workflow declares them; matched by prefix so a
// trailing clarification in the workflow doesn't silently break a match. The
// test suite parses the workflow and fails if any prefix stops matching.
export const STEP = {
  preflight: 'Preflight',
  checkoutDocs: 'Checkout netlify/docs',
  guard: 'Monotonicity guard',
  import: 'Import changed skills',
  pr: 'Open or update the rolling sync PR',
};

const PULL_URL = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+$/;

export const TRUSTED_EVENTS = ['repository_dispatch', 'workflow_dispatch'];

// Returns null when the run may be classified, else the reason it may not.
// run: {event, head_repository: {full_name}}
export function untrustedReason(run, repo) {
  const head = run.head_repository?.full_name;
  if (head !== repo) return `run belongs to ${head ?? 'an unknown repository'}, not ${repo} (fork?)`;
  if (!TRUSTED_EVENTS.includes(run.event))
    return `run was triggered by ${run.event ?? 'an unknown event'}; the receive workflow only runs on ${TRUSTED_EVENTS.join(' / ')}`;
  return null;
}

// The artifact is only trusted for the attempt that wrote it (see header).
export function outcomeForAttempt(outcome, run) {
  if (!outcome) return null;
  return outcome.run_attempt === String(run.run_attempt) ? outcome : null;
}

export function stripMarkup(s) {
  return String(s).replaceAll('<', '').replaceAll('>', '');
}

function truncate(s, max) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// The outcome artifact is written by the receive workflow from step outputs;
// every field is a string (Actions outputs are), possibly empty. Anything
// that is not a JSON object is treated as absent.
export function parseOutcome(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function groupings(outcome) {
  const changed = (outcome?.changed || '').split(',').filter(Boolean);
  if (changed.length) return `groupings: ${changed.join(' ')}`;
  if (outcome?.state_changed === 'true') return 'ordering advanced only (no skill bytes changed)';
  return 'groupings unknown (no outcome artifact)';
}

function failureDetail(step, outcome) {
  const name = step?.name ?? '';
  if (name.startsWith(STEP.preflight))
    return 'receiver not configured — DOCS_READ_TOKEN and/or CTX_PIPELINE_PR_TOKEN missing (see run)';
  if (name.startsWith(STEP.checkoutDocs)) {
    // docs_ref echoes the dispatch payload — untrusted, so it must not carry
    // Slack markup (<!channel>) into the message.
    const ref = outcome?.docs_ref ? stripMarkup(truncate(outcome.docs_ref, 60)) : 'the requested ref';
    return `could not check out netlify/docs at ${ref} — DOCS_READ_TOKEN expired, or the ref no longer exists (docs history rewrite?)`;
  }
  if (name.startsWith(STEP.guard))
    return 'monotonicity guard failed closed — docs history diverged from lastImportedCommit, or state.json is unreadable. Every later dispatch fails the same way until a manual run with skip_guard resets the baseline';
  if (name.startsWith(STEP.import))
    return 'import failed — ctx-receive exited non-zero; the run log names the cause';
  if (name.startsWith(STEP.pr))
    return `skills imported but the rolling sync PR was NOT pushed/opened (check CTX_PIPELINE_PR_TOKEN) — ${groupings(outcome)}`;
  return `receive failed at "${name || 'unknown step'}"`;
}

// run: {name, conclusion, id, html_url, event, run_attempt}
// jobs: [{name, conclusion, steps: [{name, conclusion}]}]
// outcome: parseOutcome() result, or null (artifact unavailable)
// Returns {shape, detail} or null (post nothing).
export function classifyRun(run, jobs, outcome = null) {
  if (run.name !== RECEIVE_WORKFLOW)
    return { shape: 'unclassified', detail: `unknown workflow "${run.name}"` };
  if (run.conclusion === 'skipped') return null;

  if (run.conclusion === 'cancelled' || run.conclusion === 'timed_out')
    return { shape: 'unclassified', detail: `run ${run.conclusion} before completion` };
  // Dies-before-checkout is unambiguous red, not confusion — it's the exact
  // case this watcher exists to catch.
  if (run.conclusion === 'startup_failure')
    return { shape: 'red', detail: 'workflow failed to start (startup_failure) — see the run page' };

  const job = jobs.find((j) => j.name === 'receive');
  const step = (prefix) => job?.steps?.find((s) => s.name.startsWith(prefix));

  if (run.conclusion === 'success') {
    if (!job) return { shape: 'unclassified', detail: 'green run but no "receive" job found' };
    const guard = step(STEP.guard);
    const imp = step(STEP.import);
    const pr = step(STEP.pr);
    if (pr?.conclusion === 'success') return { shape: 'imported', detail: groupings(outcome) };
    // The import step is gated only on the guard's skip output, so "guard
    // green, import skipped" is a stale delivery and nothing else.
    if (guard?.conclusion === 'success' && imp?.conclusion === 'skipped')
      return { shape: 'stale', detail: 'stale delivery — an older docs commit arrived after a newer import (AX-159); no action, self-heals on the next dispatch' };
    if (imp?.conclusion === 'success' && pr?.conclusion === 'skipped')
      return { shape: 'noop', detail: 'docs commit matches what is already imported — nothing to do' };
    return { shape: 'unclassified', detail: 'green run with unrecognized step layout' };
  }

  if (run.conclusion === 'failure') {
    if (!job) return { shape: 'red', detail: 'run failed but no "receive" job reported' };
    const failed = job.steps?.find((s) => s.conclusion === 'failure');
    if (!failed) return { shape: 'red', detail: 'run failed but no failed step reported' };
    return { shape: 'red', detail: failureDetail(failed, outcome) };
  }

  return { shape: 'unclassified', detail: `unhandled run conclusion "${run.conclusion}"` };
}

function trigger(run, outcome) {
  if (run.event === 'repository_dispatch') return 'dispatch';
  if (run.event === 'workflow_dispatch')
    return outcome?.guard_bypassed === 'true' ? 'manual (skip_guard)' : 'manual';
  return run.event || 'trigger n/a';
}

export function formatMessage(cls, run, outcome = null) {
  if (!cls) return null;
  const { emoji, label } = SHAPES[cls.shape];
  const docsSha = (outcome?.docs_sha || '').slice(0, 9);
  // workflow_run fires per attempt: a re-run posts a second message for the
  // same run ID, deliberately (a re-run that goes green must post 📥) — the
  // attempt number keeps the duplicate legible.
  const attempt = run.run_attempt > 1 ? ` (attempt ${run.run_attempt})` : '';
  const lines = [
    `${emoji} ctx-pipeline receive ${label}`,
    `${docsSha ? `docs ${docsSha}` : 'docs n/a'} · ${trigger(run, outcome)}${attempt}`,
    truncate(cls.detail, 300),
    `run: ${run.html_url}`,
  ];
  // The receive workflow only writes pr_url when the PR step succeeded, but
  // the header promises this line appears on IMPORTED alone, so the shape
  // and the URL's form are checked here rather than trusted from the artifact.
  if (cls.shape === 'imported' && PULL_URL.test(outcome?.pr_url || '')) lines.push(`PR: ${outcome.pr_url}`);
  return lines.join('\n');
}

// ── I/O below: nothing above this line shells out or reads the network ──

const RETRY_DELAYS_MS = [2000, 5000];
const HTTP_TIMEOUT_MS = 10_000;

async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
      console.error(`${label} failed (${err.message.split('\n')[0]}); retrying in ${RETRY_DELAYS_MS[attempt] / 1000}s`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: HTTP_TIMEOUT_MS });
}
function ghJson(args) {
  return withRetry(`gh ${args[0]} ${args[1]}`, async () => JSON.parse(gh(args)));
}

function loadOutcome(repo, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-notify-'));
  try {
    gh(['run', 'download', String(run.id), '-R', repo, '-n', OUTCOME_ARTIFACT, '-D', dir]);
    return outcomeForAttempt(parseOutcome(fs.readFileSync(path.join(dir, 'outcome.json'), 'utf8')), run);
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--run-id') args.runId = argv[++i];
    else if (argv[i] === '--repo') args.repo = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = args.repo || process.env.GITHUB_REPOSITORY;
  if (!args.runId || !repo) {
    console.error('usage: ctx-notify.mjs --run-id <id> [--repo owner/name] [--dry-run]');
    process.exit(2);
  }
  if (!/^\d+$/.test(args.runId)) {
    console.error(`--run-id must be numeric, got ${JSON.stringify(args.runId)}`);
    process.exit(2);
  }
  const run = await ghJson(['api', `repos/${repo}/actions/runs/${args.runId}`]);
  const refused = untrustedReason(run, repo);
  if (refused) {
    console.log(`refusing to classify run ${run.id}: ${refused}`);
    return;
  }
  const { jobs } = await ghJson(['api', `repos/${repo}/actions/runs/${args.runId}/jobs?per_page=100`]);
  const outcome = run.conclusion === 'skipped' ? null : loadOutcome(repo, run);

  const message = formatMessage(classifyRun(run, jobs, outcome), run, outcome);
  if (!message) {
    console.log(`no message for this run (${run.conclusion} ${run.name})`);
    return;
  }

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (args.dryRun || process.env.DRY_RUN === 'true' || !webhook) {
    if (!webhook) console.log('SLACK_WEBHOOK_URL unset — inert until the secret exists in the ctx-pipeline environment');
    console.log(`notify (dry-run): ${message}`);
    return;
  }
  await withRetry('Slack POST', async () => {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
  });
  console.log(`posted: ${message}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
