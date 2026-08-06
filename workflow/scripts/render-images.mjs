#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const GEMINI_SCRIPT = join(ROOT, 'skills', 'image-gen', 'scripts', 'gemini-cdp-image.mjs');
const args = process.argv.slice(2);

const value = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const has = (name) => args.includes(name);
const expandHome = (path) => path?.startsWith('~/') ? join(homedir(), path.slice(2)) : path;

const explicitPromptDir = value('--prompt-dir') ?? value('--slides');
const contentDirArg = value('--content-dir');
const contentDir = contentDirArg ? resolve(expandHome(contentDirArg)) : null;
const promptDir = explicitPromptDir
  ? resolve(expandHome(explicitPromptDir))
  : resolve(contentDir ? join(contentDir, 'slides') : join('content', 'example', 'slides'));
const provider = String(value('--provider', process.env.SOCIAL_IMAGE_PROVIDER ?? 'gemini')).toLowerCase();
const timeout = String(value('--timeout', '300'));
const regenerate = has('--regenerate') || has('--overwrite');
const dryRun = has('--dry-run');
const headless = has('--headless');
const profileDir = value('--profile-dir') ?? value('--image-profile-dir') ?? process.env.GEMINI_CHROME_PROFILE_DIR;
const chromePath = value('--chrome-path') ?? process.env.CHROME_PATH ?? process.env.CHROME_BIN;
const reportPath = value('--report');

if (has('--help') || has('-h')) {
  console.log(`Usage:
  node workflow/scripts/render-images.mjs --prompt-dir content/example/slides --provider gemini --no-headless
  node workflow/scripts/render-images.mjs --content-dir content/example --provider gemini

Options:
  --prompt-dir <dir>       Directory containing *.prompt.txt files
  --content-dir <dir>      Uses <dir>/slides as the prompt directory
  --provider <name>        gemini or codex (default: gemini)
  --regenerate             Re-render even when the PNG already exists
  --dry-run                Print planned jobs without rendering
  --timeout <seconds>      Per-image timeout for Gemini (default: 300)
  --no-headless            Use or launch visible Chrome for Gemini auth
  --headless               Run Gemini Chrome headlessly
  --profile-dir <dir>      Gemini Chrome user data directory
  --chrome-path <path>     Chrome/Chromium executable path
  --report <path>          Write a JSON report
`);
  process.exit(0);
}

if (!['gemini', 'codex'].includes(provider)) {
  console.error(`Unsupported image provider: ${provider}. Use "gemini" or "codex".`);
  process.exit(2);
}

if (!existsSync(promptDir)) {
  if (contentDir && !explicitPromptDir) {
    console.log(`[images] no slides directory: ${promptDir}`);
    writeReport({ provider, promptDir, jobs: [], rendered: [], skipped: [], failed: [] });
    process.exit(0);
  }
  console.error(`[images] prompt directory not found: ${promptDir}`);
  process.exit(2);
}

const promptFiles = readdirSync(promptDir)
  .filter((name) => name.endsWith('.prompt.txt'))
  .sort()
  .map((name) => join(promptDir, name));

const jobs = promptFiles.map((promptFile) => {
  const outputFile = promptFile.replace(/\.prompt\.txt$/, '.png');
  const exists = existsSync(outputFile) && statSync(outputFile).size > 0;
  return { promptFile, outputFile, exists };
});
const pending = jobs.filter((job) => regenerate || !job.exists);
const skipped = jobs.filter((job) => !regenerate && job.exists).map((job) => job.outputFile);

if (jobs.length === 0) {
  console.log(`[images] no *.prompt.txt files in ${promptDir}`);
  writeReport({ provider, promptDir, jobs, rendered: [], skipped, failed: [] });
  process.exit(0);
}

console.log(`[images] ${jobs.length} prompt(s), ${pending.length} pending, ${skipped.length} skipped (${provider})`);

if (dryRun) {
  for (const job of pending) console.log(`[images] would render ${basename(job.promptFile)} -> ${basename(job.outputFile)}`);
  writeReport({ provider, promptDir, jobs, rendered: [], skipped, failed: [] });
  process.exit(0);
}

if (provider === 'codex') {
  console.error('[images] Codex is a host image-tool provider, not a local Node renderer.');
  console.error('[images] Use the image-gen skill in an agent runtime with an image generation tool, or rerun with --provider gemini.');
  for (const job of pending) console.error(`[images] pending: ${job.promptFile} -> ${job.outputFile}`);
  writeReport({ provider, promptDir, jobs, rendered: [], skipped, failed: pending.map((job) => ({ ...job, reason: 'codex provider requires host image tool' })) });
  process.exit(pending.length ? 5 : 0);
}

if (!existsSync(GEMINI_SCRIPT)) {
  console.error(`[images] Gemini renderer not found: ${GEMINI_SCRIPT}`);
  process.exit(2);
}

const rendered = [];
const failed = [];

for (const job of pending) {
  mkdirSync(dirname(job.outputFile), { recursive: true });
  console.log(`[images] rendering ${basename(job.promptFile)} -> ${basename(job.outputFile)}`);
  const renderArgs = [
    GEMINI_SCRIPT,
    '--prompt-file', job.promptFile,
    '--output', job.outputFile,
    '--timeout', timeout,
  ];
  if (!headless) renderArgs.push('--no-headless');
  if (profileDir) renderArgs.push('--profile-dir', resolve(expandHome(profileDir)));
  if (chromePath) renderArgs.push('--chrome-path', expandHome(chromePath));

  const result = spawnSync(process.execPath, renderArgs, { stdio: 'inherit' });
  const ok = result.status === 0 && existsSync(job.outputFile) && statSync(job.outputFile).size > 0;
  if (ok) rendered.push(job.outputFile);
  else failed.push({ ...job, exitCode: result.status ?? 1, reason: 'renderer failed or output missing' });
}

writeReport({ provider, promptDir, jobs, rendered, skipped, failed });

if (failed.length) {
  console.error(`[images] ${failed.length} image(s) failed`);
  for (const failure of failed) console.error(`[images] failed: ${failure.promptFile} -> ${failure.outputFile}`);
  process.exit(1);
}

console.log(`[images] complete: ${rendered.length} rendered, ${skipped.length} skipped`);

function writeReport(report) {
  if (!reportPath) return;
  const out = resolve(expandHome(reportPath));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ ...report, writtenAt: new Date().toISOString() }, null, 2));
}
