#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const value = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? fallback : fallback; };
const has = (name) => args.includes(name);
const platform = value('--platform');
const contentFile = value('--content-file');
const profileDir = resolve(value('--profile-dir', process.env.SOCIAL_BROWSER_PROFILE_DIR || join(homedir(), '.social-browser-profile')));
const slidesDir = value('--slides');
const content = readFileSync(resolve(contentFile), 'utf8').trim();
const posts = platform === 'threads'
  ? content.split(/\n\s*---\s*\n/).map((x) => x.replace(/^POST\s+\d+:\s*/i, '').trim()).filter(Boolean)
  : [content];
const urls = { threads: 'https://www.threads.net/', facebook: 'https://www.facebook.com/', linkedin: 'https://www.linkedin.com/feed/' };
if (!urls[platform] || !contentFile) throw new Error('Usage: --platform <threads|facebook|linkedin> --content-file <path>');

const imagePaths = [];
if (slidesDir && existsSync(slidesDir)) {
  const { readdirSync } = await import('node:fs');
  for (const name of readdirSync(slidesDir).filter((x) => /\.(png|jpe?g|webp)$/i.test(x)).sort()) imagePaths.push(resolve(slidesDir, name));
}
console.log(`[${platform}] ${posts.length} post(s), ${imagePaths.length} image(s)`);
if (!has('--publish')) { console.log(posts.map((p, i) => `POST ${i + 1}:\n${p}`).join('\n\n---\n\n')); process.exit(0); }
if (!has('--yes')) throw new Error('Publishing requires --yes.');

mkdirSync(profileDir, { recursive: true });
const context = await chromium.launchPersistentContext(profileDir, { headless: false });
try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(urls[platform], { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (platform === 'threads') await publishThreads(page);
  else await publishSingle(page, platform, posts[0]);
  console.log(`[${platform}] submitted`);
} finally {
  await context.close();
}

async function firstVisible(locators) {
  for (const locator of locators) {
    const candidate = locator.first();
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}
async function composer(page, names) {
  const button = await firstVisible(names.map((name) => page.getByRole('button', { name, exact: false })));
  if (button) await button.click();
  await page.waitForTimeout(700);
  const editor = await firstVisible([page.locator('[contenteditable="true"]'), page.locator('textarea')]);
  if (!editor) throw new Error(`[${platform}] composer not found. Log in to the dedicated profile and retry.`);
  return editor;
}
async function upload(page) {
  if (!imagePaths.length) return;
  const input = page.locator('input[type="file"]').first();
  if (await input.count()) await input.setInputFiles(imagePaths);
}
async function submit(page, names) {
  const button = await firstVisible(names.map((name) => page.getByRole('button', { name, exact: false })));
  if (!button) throw new Error(`[${platform}] submit button not found; UI may have changed.`);
  await button.click();
  await page.waitForTimeout(1200);
}
async function publishSingle(page, target, text) {
  const editor = await composer(page, target === 'facebook' ? ['What\'s on your mind', 'Create post'] : ['Start a post', 'Post']);
  await editor.fill(text);
  await upload(page);
  await submit(page, target === 'facebook' ? ['Post', 'Share now'] : ['Post']);
}
async function publishThreads(page) {
  const editor = await composer(page, ['Start a thread', 'What\'s new', 'Create']);
  await editor.fill(posts[0]);
  await upload(page);
  for (const post of posts.slice(1)) {
    const add = await firstVisible([page.getByRole('button', { name: /add to thread|add post/i })]);
    if (!add) throw new Error('[threads] Add to thread button not found; stopping before submit.');
    await add.click();
    const next = await firstVisible([page.locator('[contenteditable="true"]'), page.locator('textarea')]);
    if (!next) throw new Error('[threads] next editor not found.');
    await next.fill(post);
  }
  await submit(page, ['Post', 'Publish']);
}
