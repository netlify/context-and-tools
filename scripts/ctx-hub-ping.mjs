#!/usr/bin/env node
// ctx-hub-ping — tell context-hub about a release moment (EX-3255).
//
// Called by .github/workflows/release-please.yml: `notify-hub` (release PR
// opened, release created) and `report` (publish finished). context-hub
// records each as an event and posts the Slack notice. This is telemetry: a
// ping never decides whether a release or publish happens, and the calling
// jobs are continue-on-error so a failed ping never turns a run red.
//
// Three commands, one POST each to ${CONTEXT_HUB_URL}<path>:
//   release-pr-opened  PR_JSON (release-please-action's `pr` output)
//   release-created    TAG
//   publish-finished   TAG, NPM_JOB_RESULT, NPM_OUTCOME, SITE_JOB_RESULT
// Every body also carries githubRunUrl, built from GITHUB_SERVER_URL,
// GITHUB_REPOSITORY and GITHUB_RUN_ID.
//
// Every input comes from env vars, never from shell interpolation. PR_JSON is
// untrusted data (a PR title is attacker-shaped text): it is parsed
// defensively and each field is validated before it goes into a body.
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
//   node scripts/ctx-hub-ping.mjs release-pr-opened | release-created | publish-finished
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

export const COMMANDS = {
  'release-pr-opened': { path: '/api/pipeline/events/ct-release-pr-opened', build: releasePrOpenedBody },
  'release-created': { path: '/api/pipeline/events/ct-release-created', build: releaseCreatedBody },
  'publish-finished': { path: '/api/pipeline/events/ct-publish-finished', build: publishFinishedBody },
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
  const ping = buildPing(command, process.env);
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
