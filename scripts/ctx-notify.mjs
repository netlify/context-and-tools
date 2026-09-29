#!/usr/bin/env node
// ctx-notify — classify a finished "Receive agent-context" run and report it
// to context-hub (EX-3057, EX-3258).
//
// Called by .github/workflows/ctx-pipeline-notify.yml (a workflow_run
// watcher). The docs-side notifier reports delivery when its dispatch is
// accepted; this one reports whether the import actually landed. context-hub
// records the event and posts the Slack notice.
//
// One event per receive run, five outcomes: imported (skills or the ordering
// position changed; the rolling sync PR was opened or updated), noop, stale
// (the monotonicity guard refused an older docs commit, AX-159), failed
// (`red` internally), unclassified (cancelled / timed out / unrecognized
// job layout). Runs with conclusion "skipped" (CTX_PIPELINE off) send nothing.
//
// POST ${CONTEXT_HUB_URL}/api/pipeline/events/ct-receive-finished with body
// { githubRunUrl, attempt, outcome, detail, docsSha, trigger, prUrl }.
// githubRunUrl is built from the repo and run id, not trusted from html_url.
// docsSha and prUrl come from the artifact and are validated (40-char hex;
// a pull URL, imported only), else null. A re-run sends a second event for
// the same run id, deliberately; `attempt` tells them apart.
//
// Trust boundary: workflow_run matches the watched workflow by NAME and fires
// for any completed run of that name, including one a fork PR produced by
// adding a pull_request trigger (or a same-named file) — and this watcher
// runs on main with the hub key. So only runs from this repository
// triggered by repository_dispatch or workflow_dispatch (the receive
// workflow's only legitimate triggers) are classified; anything else is
// refused before its steps or artifact are read. The notify workflow's job
// `if:` enforces the same rule so a foreign run never starts a runner.
//
// Classification reads GitHub's own job/step conclusions, so it works even
// for runs that die before checkout. The receive workflow additionally
// uploads a small `ctx-receive-outcome` artifact (docs sha, groupings, PR
// URL) that only enriches the event — its absence degrades docsSha to null,
// never to a wrong outcome. The artifact carries the run_attempt that wrote
// it; a re-run that dies before uploading leaves the previous attempt's file
// behind, and that one is ignored rather than attached to the new event.
// Anything unrecognized is reported as unclassified rather than guessed.
//
// GitHub API reads retry three times with backoff and a 10s timeout each;
// send() (from ctx-hub-ping.mjs) does the same for the POST. A failed send
// exits 1 — the notify run goes red in Actions; the receive run itself is
// never touched. The key is never printed.
//
// Inert until CONTEXT_HUB_URL and CONTEXT_HUB_PIPELINE_KEY exist (ctx-pipeline
// environment): without them the request prints as a dry run and the step
// exits 0.
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
import { checkHubUrl, send } from './ctx-hub-ping.mjs';

export const RECEIVE_WORKFLOW = 'Receive agent-context';
export const OUTCOME_ARTIFACT = 'ctx-receive-outcome';
export const RECEIVE_PATH = '/api/pipeline/events/ct-receive-finished';

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

const DOCS_SHA = /^[0-9a-f]{40}$/;

function trigger(run, outcome) {
  if (run.event === 'repository_dispatch') return 'dispatch';
  if (run.event === 'workflow_dispatch') return outcome?.guard_bypassed === 'true' ? 'manual_skip_guard' : 'manual';
  return null;
}

// Returns null (send nothing), else { ok: true, body } | { ok: false, error }.
// workflow_run fires per attempt: a re-run sends a second event for the same
// run id, deliberately; `attempt` keeps the duplicate distinguishable.
export function receiveBody(cls, run, outcome, repo) {
  if (!cls) return null;
  const trig = trigger(run, outcome);
  if (!trig) return { ok: false, error: `unexpected trigger ${JSON.stringify(run.event ?? null)}` };
  if (!/^\d+$/.test(String(run.id))) return { ok: false, error: `run id must be numeric, got ${JSON.stringify(run.id ?? null)}` };
  if (!Number.isInteger(run.run_attempt) || run.run_attempt < 1)
    return { ok: false, error: `run_attempt must be an integer of at least 1, got ${JSON.stringify(run.run_attempt ?? null)}` };
  const docsSha = DOCS_SHA.test(outcome?.docs_sha || '') ? outcome.docs_sha : null;
  // The receive workflow only writes pr_url when the PR step succeeded, but
  // the shape and the URL's form are checked here rather than trusted.
  const prUrl = cls.shape === 'imported' && PULL_URL.test(outcome?.pr_url || '') ? outcome.pr_url : null;
  return {
    ok: true,
    body: {
      githubRunUrl: `https://github.com/${repo}/actions/runs/${run.id}`,
      attempt: run.run_attempt,
      outcome: cls.shape === 'red' ? 'failed' : cls.shape,
      detail: truncate(cls.detail, 300),
      docsSha,
      trigger: trig,
      prUrl,
    },
  };
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

  const built = receiveBody(classifyRun(run, jobs, outcome), run, outcome, repo);
  if (!built) {
    console.log(`nothing to report for this run (${run.conclusion} ${run.name})`);
    return;
  }
  if (!built.ok) {
    console.error(`notify: ${built.error}`);
    process.exit(1);
  }

  const url = process.env.CONTEXT_HUB_URL;
  const key = process.env.CONTEXT_HUB_PIPELINE_KEY;
  if (args.dryRun || process.env.DRY_RUN === 'true' || !url || !key) {
    if (!url || !key) console.log('CONTEXT_HUB_URL / CONTEXT_HUB_PIPELINE_KEY unset — inert until they exist in the ctx-pipeline environment');
    console.log(`notify (dry-run): ${RECEIVE_PATH} ${JSON.stringify(built.body)}`);
    return;
  }
  const hub = checkHubUrl(url);
  if (!hub.ok) {
    console.error(`notify: ${hub.error}`);
    process.exit(1);
  }
  const status = await send({ url, key, path: RECEIVE_PATH, body: built.body });
  console.log(`notify: ${RECEIVE_PATH} ${status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
