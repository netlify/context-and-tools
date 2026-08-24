#!/usr/bin/env node
// ctx-ordering-guard — monotonicity guard for the Stage 2 receiver (AX-97).
//
// An out-of-order delivery (an older docs dispatch arriving after a newer one
// was already imported) must not roll skills back. This decides, from the last
// recorded import position, whether an incoming docs commit may be imported:
//
//   proceed  incoming descends from the last imported commit (or nothing has
//            been imported yet — bootstrap)
//   skip     incoming does not descend from the last imported commit
//            (stale or unrelated delivery); exit 0 with skip=1
//   fail     the recorded position exists but cannot be validated — malformed
//            JSON, a malformed ordering key, or a recorded commit the docs
//            checkout cannot resolve. Fail-closed: silence here is how
//            rollbacks happen. Exit 1.
//
// Ordering comes from the top-level `lastImportedCommit` key in state.json —
// the ordering AUTHORITY written by ctx-receive.mjs on every run. Per-grouping
// `docsCommit` entries are provenance and legitimately disagree (a partial
// import bumps only the groupings whose content changed), so they are never
// consulted here. A state file with no ordering key predates that key and is
// treated as bootstrap, not corruption.
//
// Zero dependencies, Node 18+.
//
// Usage:
//   node scripts/ctx-ordering-guard.mjs --docs <docs-checkout> --incoming <sha> [options]
//
// Options:
//   --docs <path>       Path to a netlify/docs git checkout with enough
//                       history to answer ancestry (required)
//   --incoming <sha>    The docs commit this delivery wants to import (required)
//   --state <path>      Baseline state.json to read the position from. A
//                       missing file is bootstrap. Default: .ctx-gen/state.json
//
// When GITHUB_OUTPUT is set, writes `skip=0` or `skip=1`.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const ORDERING_KEY = 'lastImportedCommit';

function parseArgs(argv) {
  const opts = { docs: null, incoming: null, state: '.ctx-gen/state.json' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--docs': opts.docs = argv[++i]; break;
      case '--incoming': opts.incoming = argv[++i]; break;
      case '--state': opts.state = argv[++i]; break;
      default:
        fail(`unknown argument: ${arg}`);
    }
  }
  if (!opts.docs) fail('--docs <path> is required');
  if (!opts.incoming) fail('--incoming <sha> is required');
  return opts;
}

function fail(msg) {
  console.error(`ctx-ordering-guard: ${msg}`);
  process.exit(1);
}

function emit(skip, msg) {
  console.log(msg);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${skip ? 1 : 0}\n`);
  }
}

// git plumbing against the docs checkout; returns the exit status rather than
// throwing, so "no" (1) is distinguishable from "broken" (anything else).
function git(docs, args) {
  try {
    execFileSync('git', ['-C', docs, ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
    return 0;
  } catch (err) {
    return typeof err.status === 'number' ? err.status : 128;
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(opts.state)) {
    emit(false, 'no prior import state — bootstrap import proceeds');
    return;
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(opts.state, 'utf8'));
  } catch (err) {
    fail(`state exists but is not valid JSON (${err.message}) — failing closed`);
  }
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    fail('state exists but is not a JSON object — failing closed');
  }

  const last = state[ORDERING_KEY];
  if (last === undefined) {
    // Pre-ordering-key state (or an empty object): provenance without a
    // position. Loud, but bootstrap — the first import after this writes the
    // key and the guard becomes effective.
    emit(false, `state has no ${ORDERING_KEY} — treating as bootstrap; ordering starts with this import`);
    return;
  }
  if (typeof last !== 'string' || !/^[0-9a-f]{40}$/.test(last)) {
    fail(`${ORDERING_KEY} is not a full commit SHA (${JSON.stringify(last)}) — failing closed (fix or explicitly reset state.json)`);
  }

  if (git(opts.docs, ['cat-file', '-e', `${last}^{commit}`]) !== 0) {
    fail(`last imported commit ${last} is not present in the docs checkout — cannot establish ordering (incomplete fetch or rewritten history); failing closed`);
  }

  const rc = git(opts.docs, ['merge-base', '--is-ancestor', last, opts.incoming]);
  if (rc === 0) {
    emit(false, `incoming ${opts.incoming} descends from last imported ${last} — proceeding`);
  } else if (rc === 1) {
    emit(true, `incoming ${opts.incoming} does not descend from last imported ${last} — skipping this delivery`);
  } else {
    fail(`merge-base failed with status ${rc} — cannot establish ordering; failing closed`);
  }
}

main();
