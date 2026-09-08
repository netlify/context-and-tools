#!/usr/bin/env node
// ctx-notify — classify a finished "Receive agent-context" run and post a
// one-line status to #notify-context-pipeline (EX-3057).
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
// Field order is a contract shared with the docs-side notifier (the channel
// is scraped as well as read): shape · run link · docs sha · trigger · detail.
// The docs sha is the correlation key: it matches the sha in the docs-side
// 📦 DELIVERED line for the same delivery.
//
// Classification reads GitHub's own job/step conclusions, so it works even
// for runs that die before checkout. The receive workflow additionally
// uploads a small `ctx-receive-outcome` artifact (docs sha, groupings, PR
// URL) that only enriches the message — its absence degrades to "docs n/a",
// never to a wrong shape. Anything unrecognized posts ⚠️ loudly rather than
// a confident guess.
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
// trailing clarification in the workflow doesn't silently break a match.
const STEP = {
  preflight: 'Preflight',
  checkoutDocs: 'Checkout netlify/docs',
  guard: 'Monotonicity guard',
  import: 'Import changed skills',
  pr: 'Open or update the rolling sync PR',
};

export function slackEscape(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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

function prLink(outcome) {
  const url = outcome?.pr_url;
  if (!url) return 'PR n/a';
  const m = /\/pull\/(\d+)$/.exec(url);
  return m ? `PR <${url}|#${m[1]}>` : `PR <${url}>`;
}

function failureDetail(step, outcome) {
  const name = step?.name ?? '';
  if (name.startsWith(STEP.preflight))
    return 'receiver not configured — DOCS_READ_TOKEN and/or CTX_PIPELINE_PR_TOKEN missing (see run)';
  if (name.startsWith(STEP.checkoutDocs)) {
    // docs_ref echoes the dispatch payload — untrusted, so it must not carry
    // Slack markup (<!channel>) into the message.
    const ref = outcome?.docs_ref ? slackEscape(truncate(outcome.docs_ref, 60)) : 'the requested ref';
    return `could not check out netlify/docs at ${ref} — DOCS_READ_TOKEN expired, or the ref no longer exists (docs history rewrite?)`;
  }
  if (name.startsWith(STEP.guard))
    return 'monotonicity guard failed closed — docs history diverged from lastImportedCommit, or state.json is unreadable. Every later dispatch fails the same way until a manual run with skip_guard resets the baseline';
  if (name.startsWith(STEP.import))
    return 'import failed — a previously imported grouping vanished upstream, or an unsupported entry (symlink) in the skill tree; see run';
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
    if (pr?.conclusion === 'success')
      return { shape: 'imported', detail: `${groupings(outcome)} · ${prLink(outcome)}` };
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
  return [
    `${emoji} ctx-pipeline receive ${label}`,
    // workflow_run fires per attempt: a re-run posts a second line for the
    // same run ID, deliberately (a re-run that goes green must post 📥) —
    // the attempt number keeps the duplicate legible.
    `<${run.html_url}|run ${run.id}>${run.run_attempt > 1 ? ` (attempt ${run.run_attempt})` : ''}`,
    docsSha ? `docs ${docsSha}` : 'docs n/a',
    slackEscape(trigger(run, outcome)),
    truncate(cls.detail, 300),
  ].join(' · ');
}

// ── I/O below: nothing above this line shells out or reads the network ──

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function ghJson(args) {
  return JSON.parse(gh(args));
}

function loadOutcome(repo, runId) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-notify-'));
  try {
    gh(['run', 'download', String(runId), '-R', repo, '-n', OUTCOME_ARTIFACT, '-D', dir]);
    return parseOutcome(fs.readFileSync(path.join(dir, 'outcome.json'), 'utf8'));
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
  const run = ghJson(['api', `repos/${repo}/actions/runs/${args.runId}`]);
  const { jobs } = ghJson(['api', `repos/${repo}/actions/runs/${args.runId}/jobs?per_page=100`]);
  const outcome = run.conclusion === 'skipped' ? null : loadOutcome(repo, args.runId);

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
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!res.ok) {
    console.error(`Slack webhook returned ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  console.log(`posted: ${message}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
