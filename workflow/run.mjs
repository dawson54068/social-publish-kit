#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLISHER = join(ROOT, 'workflow', 'scripts', 'publish.mjs');
const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const has = (name) => args.includes(name);
const explicitConfigPath = value('--config');
const rootConfigPath = join(process.cwd(), 'config.json');
const configPath = explicitConfigPath ?? (existsSync(rootConfigPath) ? rootConfigPath : null);
let config = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const contentDir = resolve(value('--content-dir', join(config.content_root ?? 'content', 'example')));
if (!configPath && existsSync(join(contentDir, 'config.json'))) {
  config = JSON.parse(readFileSync(join(contentDir, 'config.json'), 'utf8'));
}
if (!configPath && Object.keys(config).length === 0 && existsSync(join(ROOT, 'config.example.json'))) {
  config = JSON.parse(readFileSync(join(ROOT, 'config.example.json'), 'utf8'));
}
const platformValue = value('--platforms') ?? config.platforms ?? ['threads', 'facebook', 'linkedin'];
const platforms = (Array.isArray(platformValue) ? platformValue : platformValue.split(','))
  .map((p) => p.trim()).filter(Boolean);
const id = value('--id', contentDir.split(/[\\/]/).pop());
const publish = has('--publish');
const approved = has('--yes');

const files = {
  threads: join(contentDir, 'threads.md'),
  facebook: join(contentDir, 'facebook.md'),
  linkedin: join(contentDir, 'linkedin.md'),
};
const limits = { threads: 500, facebook: 63206, linkedin: 3000 };

if (!existsSync(contentDir)) {
  console.error(`Content directory not found: ${contentDir}`);
  process.exit(2);
}

let failed = false;
for (const platform of platforms) {
  const file = files[platform];
  if (!file || !existsSync(file)) {
    console.error(`[${platform}] missing ${file ?? 'supported platform file'}`);
    failed = true;
    continue;
  }
  const text = readFileSync(file, 'utf8').trim();
  const chunks = platform === 'threads'
    ? text.split(/\n\s*---\s*\n/).map((x) => x.replace(/^POST\s+\d+:\s*/i, '').trim()).filter(Boolean)
    : [text];
  const over = chunks.map((chunk, i) => ({ i: i + 1, length: Array.from(chunk).length }))
    .filter((x) => x.length > limits[platform]);
  if (over.length) {
    console.error(`[${platform}] length limit exceeded: ${JSON.stringify(over)}`);
    failed = true;
  }
  console.log(`[${platform}] ${file} ready (${chunks.length} part${chunks.length === 1 ? '' : 's'})`);
}

if (failed) process.exit(3);
if (!publish) {
  console.log('Preview only. Use --publish --yes to submit through the browser.');
  process.exit(0);
}
if (!approved) {
  console.error('Publishing requires explicit --yes. No platform was opened.');
  process.exit(4);
}
if (config.publishers_enabled === false && !has('--force')) {
  console.error('Publishing is disabled in config.json. Set publishers_enabled=true or pass --force.');
  process.exit(4);
}

const results = [];
for (const platform of platforms) {
  const publisherArgs = ['--platform', platform, '--content-file', files[platform], '--publish', '--yes'];
  const slides = join(contentDir, 'slides');
  if (existsSync(slides)) publisherArgs.push('--slides', slides);
  if (config.browser_profile_dir) publisherArgs.push('--profile-dir', resolve(config.browser_profile_dir));
  const result = spawnSync(process.execPath, [PUBLISHER, ...publisherArgs], { stdio: 'inherit' });
  results.push({ platform, exitCode: result.status ?? 1 });
  if (result.status !== 0) {
    console.error(`[${platform}] failed; stopping to avoid partial duplication.`);
    break;
  }
}
writeFileSync(join(contentDir, 'publish-results.json'), JSON.stringify({ id, results, publishedAt: new Date().toISOString() }, null, 2));
process.exit(results.every((r) => r.exitCode === 0) ? 0 : 1);
