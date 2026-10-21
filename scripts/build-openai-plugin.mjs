#!/usr/bin/env node
// build-openai-plugin — OpenAI Plugins submission package.
//
// OpenAI takes the Agent Plugins layout as a ZIP, with its listing and review
// metadata under `extensions.com.openai` in the root plugin.json. The portable
// package in agent-plugin/ stays host-neutral; this script layers openai/ on
// top of a copy of it:
//
//   agent-plugin/*            -> <out>/<name>/         (as-is)
//   openai/plugin.json        -> merged over plugin.json
//   openai/assets/*           -> <out>/<name>/assets/
//
// openai/plugin.json overrides top-level fields (OpenAI's plugin is named
// `netlify`, not `netlify-skills`) and supplies extensions.com.openai. The
// version always comes from agent-plugin/, where release-please stamps it.
// The result is validated against the submission rules and zipped to
// <out>/<name>-<version>.zip. Nothing is uploaded.
// Rules: https://developers.openai.com/plugins/deploy/submission
//
// Usage:
//   node scripts/build-openai-plugin.mjs [options]
//
// Options:
//   --out <dir>   Output directory (default: build/openai; wiped and recreated —
//                 must be new, empty, or a previous build-openai-plugin output)
//   --repo <path> Repository root (default: .)
//   --no-zip      Stop after building and validating the directory

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MARKER = '.build-openai-plugin';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_LENGTH = { displayName: 30, shortDescription: 30, longDescription: 4000 };
const MAX_DEFAULT_PROMPTS = 3;
const MAX_DEFAULT_PROMPT_LENGTH = 128;
const REQUIRED_INTERFACE = [
  'displayName', 'shortDescription', 'longDescription', 'developerName',
  'websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL',
  'composerIcon', 'logo',
];
// Initial MCP submissions need these in `review`, here or in the dashboard.
const MIN_POSITIVE_CASES = 5;
const MIN_NEGATIVE_CASES = 3;

function fail(message) {
  console.error(`build-openai-plugin: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { out: 'build/openai', repo: '.', zip: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[++i];
    else if (arg === '--repo') options.repo = argv[++i];
    else if (arg === '--no-zip') options.zip = false;
    else fail(`unknown argument: ${arg}`);
  }
  if (!options.out) fail('--out needs a directory');
  return options;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read ${file}: ${error.message}`);
  }
}

// The output is wiped on every build, so refuse anything we did not create.
function prepareOutput(out, repo) {
  const resolved = path.resolve(out);
  const root = path.resolve(repo);
  if (resolved === root || root.startsWith(resolved + path.sep) || resolved === path.parse(resolved).root) {
    throw new Error(`refusing to use ${out} as the output directory`);
  }
  if (fs.existsSync(resolved)) {
    const entries = fs.readdirSync(resolved);
    if (entries.length && !entries.includes(MARKER)) {
      throw new Error(`${out} is not empty and was not created by this script`);
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  fs.mkdirSync(resolved, { recursive: true });
  fs.writeFileSync(path.join(resolved, MARKER), '');
  return resolved;
}

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// Returns { errors, warnings } for a built package directory. Errors are the
// "required setup and validation" findings the portal blocks on; warnings are
// review requirements that can also be met in the dashboard.
export function validatePackage(dir) {
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(dir, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return { errors: ['plugin.json is missing'], warnings };
  const manifest = readJson(manifestPath);

  for (const field of ['name', 'version', 'description']) {
    if (!manifest[field]) errors.push(`plugin.json: ${field} is required`);
  }
  const openai = manifest.extensions?.['com.openai'];
  if (!openai) return { errors: [...errors, 'plugin.json: extensions.com.openai is missing'], warnings };

  if ('apps' in openai) errors.push('extensions.com.openai.apps is not allowed in a submission package');
  if ('hooks' in openai || 'hooks' in manifest) errors.push('hooks are not allowed in a submission package');
  const files = walk(dir);
  if (files.includes('.app.json')) errors.push('.app.json is not allowed in a submission package');
  if (files.some((file) => file.startsWith('hooks/'))) errors.push('hooks/ is not allowed in a submission package');

  const ui = openai.interface ?? {};
  for (const field of REQUIRED_INTERFACE) {
    if (!ui[field] || (typeof ui[field] === 'string' && !ui[field].trim())) {
      errors.push(`interface.${field} is required`);
    }
  }
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (typeof ui[field] === 'string' && [...ui[field]].length > max) {
      errors.push(`interface.${field} is ${[...ui[field]].length} characters (max ${max})`);
    }
  }
  const prompts = ui.defaultPrompt === undefined ? [] : [ui.defaultPrompt].flat();
  if (prompts.length > MAX_DEFAULT_PROMPTS) {
    errors.push(`interface.defaultPrompt has ${prompts.length} prompts (max ${MAX_DEFAULT_PROMPTS})`);
  }
  prompts.forEach((prompt, i) => {
    if (typeof prompt !== 'string' || !prompt.trim()) errors.push(`interface.defaultPrompt[${i}] must be a non-empty string`);
    else if ([...prompt].length > MAX_DEFAULT_PROMPT_LENGTH) {
      errors.push(`interface.defaultPrompt[${i}] is ${[...prompt].length} characters (max ${MAX_DEFAULT_PROMPT_LENGTH})`);
    }
  });
  if (new Set(prompts).size !== prompts.length) errors.push('interface.defaultPrompt entries must be unique');
  for (const field of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
    if (ui[field] && !/^https:\/\//.test(ui[field])) errors.push(`interface.${field} must be an https:// URL`);
  }
  for (const field of ['brandColor', 'brandColorDark']) {
    if (ui[field] && !/^#[0-9a-fA-F]{6}$/.test(ui[field])) errors.push(`interface.${field} must be a #RRGGBB color`);
  }

  const images = [
    ['composerIcon', ui.composerIcon],
    ['logo', ui.logo],
    ...(ui.screenshots ?? []).map((value, i) => [`screenshots[${i}]`, value]),
  ].filter(([, value]) => value);
  for (const [field, value] of images) {
    if (!value.startsWith('./')) {
      errors.push(`interface.${field}: path must start with ./ (got ${value})`);
      continue;
    }
    const target = path.resolve(dir, value);
    if (!target.startsWith(path.resolve(dir) + path.sep)) {
      errors.push(`interface.${field}: ${value} is outside the package`);
    } else if (!fs.existsSync(target)) {
      errors.push(`interface.${field}: ${value} does not exist (add it to openai/assets/)`);
    } else if (!IMAGE_EXTENSIONS.has(path.extname(target).toLowerCase())) {
      errors.push(`interface.${field}: ${value} must be PNG, JPEG, WebP, or SVG`);
    } else if (fs.statSync(target).size > MAX_IMAGE_BYTES) {
      errors.push(`interface.${field}: ${value} is larger than 5 MiB`);
    }
  }

  const mcpPath = ['mcp.json', '.mcp.json'].map((name) => path.join(dir, name)).find((file) => fs.existsSync(file));
  if (mcpPath) {
    for (const [name, server] of Object.entries(readJson(mcpPath).mcpServers ?? {})) {
      if (server.type !== 'streamable-http' || !/^https:\/\//.test(server.url ?? '')) {
        errors.push(`${path.basename(mcpPath)}: server "${name}" must be streamable-http over https://`);
      }
    }
    const review = openai.review ?? {};
    const positive = review.test_cases?.positive?.length ?? 0;
    const negative = review.test_cases?.negative?.length ?? 0;
    if (positive < MIN_POSITIVE_CASES || negative < MIN_NEGATIVE_CASES) {
      warnings.push(`review.test_cases has ${positive} positive / ${negative} negative (an initial MCP submission needs ${MIN_POSITIVE_CASES} / ${MIN_NEGATIVE_CASES}; add them to openai/plugin.json or the dashboard)`);
    }
    if (!review.demo_recording_url) {
      warnings.push('review.demo_recording_url is not set (required for MCP review; add it to openai/extension.json or the dashboard)');
    }
  }

  return { errors, warnings };
}

export function buildOpenaiPlugin({ out = 'build/openai', repo = '.', zip = true } = {}) {
  const source = path.join(repo, 'agent-plugin');
  const overlay = path.join(repo, 'openai');
  const base = readJson(path.join(source, 'plugin.json'));
  const overrides = readJson(path.join(overlay, 'plugin.json'));
  if ('version' in overrides) throw new Error('openai/plugin.json must not set version (it comes from agent-plugin/plugin.json)');
  const manifest = { ...base, ...overrides, extensions: { ...base.extensions, ...overrides.extensions } };

  const output = prepareOutput(out, repo);
  const pkg = path.join(output, manifest.name);
  fs.cpSync(source, pkg, { recursive: true, filter: (file) => path.basename(file) !== '.DS_Store' });
  const assets = path.join(overlay, 'assets');
  if (fs.existsSync(assets)) {
    fs.cpSync(assets, path.join(pkg, 'assets'), {
      recursive: true,
      filter: (file) => !['.DS_Store', '.gitkeep'].includes(path.basename(file)),
    });
  }
  fs.writeFileSync(path.join(pkg, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const { errors, warnings } = validatePackage(pkg);
  for (const warning of warnings) console.warn(`[warn] ${warning}`);
  if (errors.length) {
    throw new Error(`package is not ready to submit:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }

  if (!zip) {
    console.log(`[done] ${path.relative(process.cwd(), pkg)}`);
    return { dir: pkg, zip: null };
  }
  const archive = path.join(output, `${manifest.name}-${manifest.version}.zip`);
  // Zip the contents so plugin.json sits at the archive root; -X drops
  // platform-specific extra attributes.
  execFileSync('zip', ['-q', '-r', '-X', archive, '.'], { cwd: pkg, stdio: ['ignore', 'ignore', 'pipe'] });
  console.log(`[done] ${path.relative(process.cwd(), archive)}`);
  return { dir: pkg, zip: archive };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  try {
    buildOpenaiPlugin(options);
  } catch (error) {
    fail(error.message);
  }
}
