#!/usr/bin/env node
// ctx-hub-ping — tell context-hub about a release moment or a sync PR closing
// (EX-3255, EX-3352).
//
// Called by .github/workflows/release-please.yml: `notify-hub` (release PR
// opened, release created) and `report` (publish finished); and by the
// workflow that watches the sync PR close. context-hub records each as an
// event and posts the Slack notice. This is telemetry: a ping never decides
// whether a release or publish happens, and the calling jobs are
// continue-on-error so a failed ping never turns a run red.
//
// Four commands, one POST each to ${CONTEXT_HUB_URL}<path>:
//   release-pr-opened  PR_JSON (release-please-action's `pr` output)
//   release-created    TAG
//   publish-finished   TAG, NPM_JOB_RESULT, NPM_OUTCOME, SITE_JOB_RESULT
//   sync-pr-closed     PR_NUMBER, MERGED, GITHUB_RUN_ATTEMPT, SYNC_STATE_FILE
// Every body also carries githubRunUrl, built from GITHUB_SERVER_URL,
// GITHUB_REPOSITORY and GITHUB_RUN_ID.
//
// Every input comes from env vars, never from shell interpolation. PR_JSON is
// untrusted data (a PR title is attacker-shaped text): it is parsed
// defensively and each field is validated before it goes into a body.
// SYNC_STATE_FILE names the sync state file; main() reads it into SYNC_STATE,
// and only a 40-hex lastImportedCommit in it is ever used (a missing or odd
// file just means docsSha: null).
//
// send() retries 5xx and network errors twice with a 10s timeout per attempt.
// 4xx is a caller error and is never retried. The key is read from
// process.env only in main() and is never printed, nor is the Authorization
// header.
//
// Inert until CONTEXT_HUB_URL and CONTEXT_HUB_PIPELINE_KEY exist (ctx-pipeline
// environment): without them the request prints as a dry run and the script
// exits 0. Invalid input or a failed send exits 1.
//
// Zero dependencies, Node 18+.
//
// Usage:
//   node scripts/ctx-hub-ping.mjs release-pr-opened | release-created | publish-finished | sync-pr-closed
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';


const TAG = /^v\d+\.\d+\.\d+$/;
const RUN_ID = /^\d+$/;

export function runUrl(env) {
  return `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
}

const fail = (error) => ({ ok: false, error });

function checkedRunUrl(env) {
  if (!env.GITHUB_SERVER_URL || !env.GITHUB_REPOSITORY) return fail('GITHUB_SERVER_URL and GITHUB_REPOSITORY are required');
  if (!RUN_ID.test(env.GITHUB_RUN_ID || '')) return fail('GITHUB_RUN_ID must be numeric');
  return { ok: true, url: runUrl(env) };
}

function checkedTag(env) {
  return TAG.test(env.TAG || '') ? { ok: true, tag: env.TAG } : fail(`TAG must look like v1.2.3, got ${JSON.stringify(env.TAG ?? null)}`);
}

// PR_JSON is release-please-action's `pr` output: a JSON object with number,
// headBranchName and title (among others). Only those three are read.
export function releasePrOpenedBody(env) {
  const run = checkedRunUrl(env);
  if (!run.ok) return run;
  let pr;
  try {
    pr = JSON.parse(env.PR_JSON);
  } catch {
    return fail('PR_JSON is not valid JSON');
  }
  if (pr === null || typeof pr !== 'object' || Array.isArray(pr)) return fail('PR_JSON must be a JSON object');
  if (!Number.isInteger(pr.number) || pr.number <= 0) return fail('PR_JSON.number must be a positive integer');
  if (typeof pr.headBranchName !== 'string' || !pr.headBranchName.startsWith('release-please--'))
    return fail('PR_JSON.headBranchName must start with release-please--');
  if (typeof pr.title !== 'string' || pr.title.length < 1 || pr.title.length > 256)
    return fail('PR_JSON.title must be a string of 1-256 characters');
  return { ok: true, body: { githubRunUrl: run.url, prNumber: pr.number, branch: pr.headBranchName, title: pr.title } };
}

export function releaseCreatedBody(env) {
  const run = checkedRunUrl(env);
  if (!run.ok) return run;
  const tag = checkedTag(env);
  if (!tag.ok) return tag;
  return { ok: true, body: { githubRunUrl: run.url, tag: tag.tag } };
}

// jobResult is a needs.<job>.result; outcome is the publish step's `result`
// output, empty when the step never wrote one.
export function mapNpm(jobResult, outcome) {
  if (jobResult === 'success') return outcome === 'published' || outcome === 'already_published' ? outcome : 'failed';
  if (jobResult === 'skipped') return 'not_run';
  return 'failed';
}

export function mapSite(jobResult) {
  if (jobResult === 'success') return 'passed';
  if (jobResult === 'skipped') return 'not_run';
  return 'failed';
}

export function publishFinishedBody(env) {
  const run = checkedRunUrl(env);
  if (!run.ok) return run;
  const tag = checkedTag(env);
  if (!tag.ok) return tag;
  return {
    ok: true,
    body: {
      githubRunUrl: run.url,
      tag: tag.tag,
      npm: mapNpm(env.NPM_JOB_RESULT, env.NPM_OUTCOME),
      site: mapSite(env.SITE_JOB_RESULT),
    },
  };
}

const SHA = /^[0-9a-f]{40}$/;
const DIGITS = /^\d+$/;

// The sync state file's lastImportedCommit, or null for anything else (bad
// JSON, wrong shape, not 40 lowercase hex). Never throws: the hub treats a
// null sha as "unknown", which beats failing the ping.
export function importedCommitFrom(stateText) {
  try {
    const state = JSON.parse(stateText);
    if (state === null || typeof state !== 'object') return null;
    return typeof state.lastImportedCommit === 'string' && SHA.test(state.lastImportedCommit) ? state.lastImportedCommit : null;
  } catch {
    return null;
  }
}

const positiveInt = (raw) => (DIGITS.test(raw ?? '') && Number.isSafeInteger(Number(raw)) && Number(raw) > 0 ? Number(raw) : null);

// docsSha is only meaningful for a merged PR; the hub refuses it otherwise.
export function syncPrClosedBody(env) {
  const run = checkedRunUrl(env);
  if (!run.ok) return run;
  const prNumber = positiveInt(env.PR_NUMBER);
  if (prNumber === null) return fail('PR_NUMBER must be a positive integer');
  if (env.MERGED !== 'true' && env.MERGED !== 'false') return fail(`MERGED must be true or false, got ${JSON.stringify(env.MERGED ?? null)}`);
  const attempt = positiveInt(env.GITHUB_RUN_ATTEMPT);
  if (attempt === null) return fail('GITHUB_RUN_ATTEMPT must be a positive integer');
  const merged = env.MERGED === 'true';
  return {
    ok: true,
    body: { githubRunUrl: run.url, attempt, prNumber, merged, docsSha: merged ? importedCommitFrom(env.SYNC_STATE ?? '') : null },
  };
}

export const COMMANDS = {
  'release-pr-opened': { path: '/api/pipeline/events/ct-release-pr-opened', build: releasePrOpenedBody },
  'release-created': { path: '/api/pipeline/events/ct-release-created', build: releaseCreatedBody },
  'publish-finished': { path: '/api/pipeline/events/ct-publish-finished', build: publishFinishedBody },
  'sync-pr-closed': { path: '/api/pipeline/events/ct-sync-pr-closed', build: syncPrClosedBody },
};

export function buildPing(command, env) {
  if (!Object.hasOwn(COMMANDS, command)) return fail(`unknown command ${JSON.stringify(command ?? null)}; expected ${Object.keys(COMMANDS).join(' | ')}`);
  const { path, build } = COMMANDS[command];
  const built = build(env);
  return built.ok ? { ok: true, path, body: built.body } : built;
}

// The bearer key goes to CONTEXT_HUB_URL, so a plaintext host would expose it
// to interception. Loopback is exempt for local runs. Never echoes the key.
export function checkHubUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return fail('CONTEXT_HUB_URL is not a valid URL');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    return fail('CONTEXT_HUB_URL must be https:// (http:// is accepted for localhost only)');
  }
  return { ok: true };
}

// ── I/O below: nothing above this line reads the network or the environment ──

const RETRY_DELAYS_MS = [2000, 5000];
const HTTP_TIMEOUT_MS = 10_000;

// Resolves with the HTTP status on 2xx. Rejects on a 4xx (never retried), or
// on a 5xx / network error once the delays are used up.
export async function send({ url, key, path, body, fetchImpl = fetch, delays = RETRY_DELAYS_MS }) {
  // A trailing slash on CONTEXT_HUB_URL would make `//api/...`, a 404 the
  // retry loop never retries.
  const endpoint = `${url.replace(/\/+$/, '')}${path}`;
  for (let attempt = 0; ; attempt += 1) {
    let retryable;
    let message;
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (res.status >= 200 && res.status < 300) return res.status;
      retryable = res.status >= 500;
      message = `context-hub returned ${res.status}`;
    } catch (err) {
      retryable = true;
      message = `request failed (${String(err?.message ?? err).split('\n')[0]})`;
    }
    if (!retryable || attempt >= delays.length) throw new Error(message);
    console.error(`${message}; retrying in ${delays[attempt] / 1000}s`);
    await new Promise((r) => setTimeout(r, delays[attempt]));
  }
}

async function main() {
  const command = process.argv[2];
  let env = process.env;
  if (command === 'sync-pr-closed' && process.env.SYNC_STATE_FILE) {
    // A missing or unreadable state file means no state, not a failed ping.
    let text = '';
    try {
      text = fs.readFileSync(process.env.SYNC_STATE_FILE, 'utf8');
    } catch {}
    env = { ...process.env, SYNC_STATE: text };
  }
  const ping = buildPing(command, env);
  if (!ping.ok) {
    console.error(`hub-ping: ${ping.error}`);
    process.exit(1);
  }
  const url = process.env.CONTEXT_HUB_URL;
  const key = process.env.CONTEXT_HUB_PIPELINE_KEY;
  if (!url || !key) {
    console.log(`hub-ping (dry-run): ${ping.path} ${JSON.stringify(ping.body)}`);
    return;
  }
  const hub = checkHubUrl(url);
  if (!hub.ok) {
    console.error(`hub-ping: ${hub.error}`);
    process.exit(1);
  }
  const status = await send({ url, key, path: ping.path, body: ping.body });
  console.log(`hub-ping: ${ping.path} ${status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`hub-ping: ${err.message}`);
    process.exit(1);
  });
}
