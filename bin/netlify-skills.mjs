#!/usr/bin/env node
// netlify-skills — install one Netlify skill and keep it current (EX-3054).
//
// A project takes only the skills it needs, straight out of the package this
// command came with, with no clone of this repo:
// `npx @netlify/skills@latest add netlify-functions` is the whole install.
// This is a thin front on scripts/fetch-skill.mjs; the sync rules live there.
//
// Usage:
//   netlify-skills add <skill> [<skill>...] [--agent <name> | --dest <dir>] [--remote | --host <url>] [--version <semver>]
//   netlify-skills add --all [--agent <name> | --dest <dir>] [--remote | --host <url>] [--version <semver>]
//   netlify-skills check [<dir> | --agent <name>] [--strict] [--json] [--remote | --host <url>] [--version <semver>]
//   netlify-skills update [<dir> | --agent <name>] [--all] [--reset] [--json] [--remote | --host <url>] [--version <semver>]
//
// `status` is an alias for `check`; a quoted `*` is accepted for `--all`;
// `add functions` means `add netlify-functions`.
//
// Where skills go: each agent reads a project-level skills directory (AGENTS
// below; the same table the `skills` CLI at skills.sh maintains with the
// vendors). `--agent <name>` picks one; `--dest <dir>` names any directory.
// With neither, the command uses the one agent directory already present in
// the project (`.claude/`, `.agents/`, or `.grok/`), and refuses to guess when
// there is none or more than one, so a project is never given a directory
// its agent does not read.
//
// Source selection (the two sources themselves are described in
// scripts/fetch-skill.mjs): the bundled package by default; `--remote`,
// `--host <url>`, NETLIFY_SKILLS_HOST, or `--version` switch to the hosted
// manifest. From a repo checkout with no built manifest.json, the hosted
// default is used.
//
// Run through npx as `npx @netlify/skills@latest …`: npx may otherwise reuse
// a cached older package, and the release you install from should be the
// newest one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../scripts/fetch-skill.mjs';

const DEFAULT_HOST = 'https://netlify-agent-skills.netlify.app';
// Project-level skills directory per agent, as each agent's own docs list it
// (linked from the README's Installation table). Cursor, Codex, Gemini CLI,
// and GitHub Copilot (VS Code) all read the shared `.agents/skills/`.
const AGENTS = {
  'claude-code': '.claude/skills',
  cursor: '.agents/skills',
  codex: '.agents/skills',
  'gemini-cli': '.agents/skills',
  'github-copilot': '.agents/skills',
  grok: '.grok/skills',
};
const AGENT_DIRS = [...new Set(Object.values(AGENTS))];
// NETLIFY_SKILLS_PACKAGE_ROOT exists for tests, which point it at a fixture.
const PACKAGE_ROOT = process.env.NETLIFY_SKILLS_PACKAGE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(message) {
  if (message) console.error(`netlify-skills: ${message}\n`);
  console.error([
    'Usage:',
    '  netlify-skills add <skill> [<skill>...] [--agent <name> | --dest <dir>] [--remote | --host <url>] [--version <semver>]',
    '  netlify-skills add --all [--agent <name> | --dest <dir>] [--remote | --host <url>] [--version <semver>]',
    '  netlify-skills check [<dir> | --agent <name>] [--strict] [--json] [--remote | --host <url>] [--version <semver>]',
    '  netlify-skills update [<dir> | --agent <name>] [--all] [--reset] [--json] [--remote | --host <url>] [--version <semver>]',
    '',
    'status is an alias for check; "*" (quoted) works like --all; add functions means add netlify-functions.',
    `Agents: ${Object.entries(AGENTS).map(([name, dir]) => `${name} (${dir})`).join(', ')}.`,
    'Without --agent or --dest, the one agent directory already in the project is used.',
    "Skills come from this package's own release. --remote uses the hosted manifest",
    `(${process.env.NETLIFY_SKILLS_HOST || DEFAULT_HOST}) so you reconcile against the newest release regardless of package version.`,
  ].join('\n'));
  process.exit(message ? 1 : 0);
}

function parse(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') usage();
  const aliases = { status: 'check' };
  const resolved = aliases[command] || command;
  if (!['add', 'check', 'update'].includes(resolved)) usage(`unknown command: ${command}`);

  const flags = { host: null, remote: false, version: null, dest: null, agent: null, all: false, strict: false, reset: false, json: false };
  const positionals = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const value = () => {
      const next = rest[++i];
      if (next === undefined) usage(`${arg} requires a value`);
      return next;
    };
    switch (arg) {
      case '--host': flags.host = value(); break;
      case '--remote': flags.remote = true; break;
      case '--version': flags.version = value(); break;
      case '--dest': flags.dest = value(); break;
      case '--agent': flags.agent = value(); break;
      case '--all': case '*': flags.all = true; break;
      case '--strict': flags.strict = true; break;
      case '--reset': flags.reset = true; break;
      case '--json': flags.json = true; break;
      default:
        if (arg.startsWith('-')) usage(`unknown option: ${arg}`);
        positionals.push(arg);
    }
  }
  return { command: resolved, flags, positionals };
}

// The skills directory for this run: --agent, --dest / the positional
// directory, or the one agent directory present in the project.
function skillsDir(command, explicit, flags) {
  if (flags.agent && explicit) usage(`pass one of --agent or ${command === 'add' ? '--dest' : 'a directory'}`);
  if (flags.agent) {
    if (!AGENTS[flags.agent]) usage(`unknown agent: ${flags.agent} (one of ${Object.keys(AGENTS).join(', ')})`);
    return AGENTS[flags.agent];
  }
  if (explicit) return explicit;
  const present = AGENT_DIRS.filter((dir) => fs.existsSync(path.dirname(dir)));
  const how = command === 'add' ? '--agent <name> or --dest <dir>' : `--agent <name> or the directory as an argument`;
  if (!present.length) usage(`no agent directory (${AGENT_DIRS.map(path.dirname).join(', ')}) found in ${process.cwd()}; pass ${how}`);
  if (present.length > 1) usage(`more than one agent directory here (${present.map(path.dirname).join(', ')}); pass ${how}`);
  console.error(`netlify-skills: using ${present[0]} (found ${path.dirname(present[0])}/)`);
  return present[0];
}

const { command, flags, positionals } = parse(process.argv.slice(2));
if (flags.host && flags.remote) usage('--remote uses the default hosted manifest; pass one of --remote or --host <url>');
const bundled = fs.existsSync(path.join(PACKAGE_ROOT, 'manifest.json'));
const remoteHost = flags.host || process.env.NETLIFY_SKILLS_HOST || DEFAULT_HOST;
const args = [];
if (flags.host || flags.remote || flags.version || !bundled) args.push('--host', remoteHost);
else args.push('--source', PACKAGE_ROOT);
if (flags.version) args.push('--version', flags.version);

if (command === 'add') {
  if (!positionals.length && !flags.all) usage('add needs at least one skill name, or --all');
  if (positionals.length && flags.all) usage('--all cannot be combined with skill names');
  if (flags.strict || flags.json || flags.reset) usage('--strict, --reset, and --json apply to check/update only');
  args.push('--dest', skillsDir(command, flags.dest, flags));
  if (flags.all) args.push('--all');
  for (const skill of positionals) args.push('--skill', skill);
} else {
  if (positionals.length > 1) usage(`${command} takes at most one directory`);
  if (flags.dest) usage(`--dest applies to add only; pass the directory to ${command} as an argument`);
  args.push(`--${command}`, skillsDir(command, positionals[0], flags));
  if (command === 'check' && flags.reset) usage('--reset applies to update only');
  if (command === 'check' && flags.all) usage('--all applies to add and update only');
  if (command === 'update' && flags.strict) usage('--strict applies to check only');
  if (flags.all) args.push('--all');
  if (flags.strict) args.push('--strict');
  if (flags.reset) args.push('--reset');
  if (flags.json) args.push('--json');
}

run(args).catch((error) => {
  console.error(`netlify-skills: ${error.message}`);
  process.exit(1);
});
