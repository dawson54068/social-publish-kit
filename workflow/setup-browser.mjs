#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const value = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? fallback : fallback; };
const platforms = (value('--platforms', 'threads,facebook,linkedin')).split(',').map((p) => p.trim()).filter(Boolean);
const profileDir = resolve(value('--profile-dir', process.env.SOCIAL_BROWSER_PROFILE_DIR || join(homedir(), '.social-browser-profile')));
const urls = { threads: 'https://www.threads.net/', facebook: 'https://www.facebook.com/', linkedin: 'https://www.linkedin.com/feed/' };
const selected = platforms.filter((p) => urls[p]);
if (!selected.length) throw new Error('No supported platform selected. Use threads,facebook,linkedin.');

mkdirSync(profileDir, { recursive: true });
console.log(`Dedicated browser profile: ${profileDir}`);
console.log('This profile stores login state locally. Do not commit or share this directory.');
const context = await chromium.launchPersistentContext(profileDir, { headless: false });
const rl = createInterface({ input, output });
try {
  for (const platform of selected) {
    const page = await context.newPage();
    await page.goto(urls[platform], { waitUntil: 'domcontentloaded' });
    console.log(`\n[${platform}] Log in manually in the opened browser if needed.`);
    await rl.question(`[${platform}] When the account page is ready, press Enter here to continue...`);
    await page.close();
  }
  console.log('\nSetup complete. Use the workflow in preview mode before publishing.');
} finally {
  rl.close();
  await context.close();
}
