#!/usr/bin/env node
/**
 * gemini-cdp-image.mjs
 *
 * Connects to Chrome via CDP, navigates to Gemini, generates an image,
 * and saves it locally. Can launch Chrome headlessly (default) or connect
 * to an already-running Chrome instance.
 *
 * Usage:
 *   node gemini-cdp-image.mjs --prompt "your prompt" --output "path/to/image.png"
 *   node gemini-cdp-image.mjs --prompt "..." --output "..." --no-headless
 *
 * Options:
 *   --prompt       Image generation prompt (required)
 *   --prompt-file  Read the image generation prompt from a file
 *   --output       Output file path (required)
 *   --cdp-url      CDP endpoint (default: http://localhost:9222)
 *   --profile-dir  Chrome user data dir (default: ~/.chrome-debug-profile)
 *   --chrome-path  Chrome/Chromium executable path
 *   --timeout      Max wait for image in seconds (default: 300)
 *   --no-headless  Connect to an already-running Chrome instead of launching headless
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir, platform } from 'os';
import { parseArgs } from 'util';
import { spawn, spawnSync } from 'child_process';

const { values: args } = parseArgs({
  options: {
    prompt:        { type: 'string' },
    'prompt-file': { type: 'string' },
    output:        { type: 'string' },
    'cdp-url':     { type: 'string', default: 'http://localhost:9222' },
    'profile-dir': { type: 'string' },
    'chrome-path': { type: 'string' },
    timeout:       { type: 'string', default: '300' },
    'no-headless': { type: 'boolean', default: false },
  },
});

// Resolve prompt from --prompt or --prompt-file
const promptText = args.prompt ?? (args['prompt-file'] ? readFileSync(args['prompt-file'], 'utf8').trim() : undefined);

if (!promptText || !args.output) {
  console.error('Usage: node gemini-cdp-image.mjs --prompt "..." --output "path/to/image.png"');
  console.error('       node gemini-cdp-image.mjs --prompt-file path/to/prompt.txt --output "path/to/image.png"');
  process.exit(1);
}

const GEMINI_URL = 'https://gemini.google.com/app';
const CDP_URL = args['cdp-url'];
const TIMEOUT_SECONDS = parseInt(args.timeout, 10);
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = Math.ceil((TIMEOUT_SECONDS * 1000) / POLL_INTERVAL_MS);
const HEADLESS = !args['no-headless'];
const CHROME_PATH = args['chrome-path'] ?? process.env.CHROME_PATH ?? process.env.CHROME_BIN ?? findChromeExecutable();
const USER_DATA_DIR = args['profile-dir'] ?? process.env.GEMINI_CHROME_PROFILE_DIR ?? join(homedir(), '.chrome-debug-profile');

let chromeProcess = null;

function findChromeExecutable() {
  const candidates = [];

  switch (platform()) {
    case 'darwin':
      candidates.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      );
      break;
    case 'win32':
      candidates.push(
        join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
        join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
        join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
      );
      break;
    default:
      candidates.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      );
  }

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function requireChromePath() {
  if (CHROME_PATH) return CHROME_PATH;
  throw new Error('Could not find Chrome/Chromium. Pass --chrome-path or set CHROME_PATH/CHROME_BIN.');
}

function cleanupChrome() {
  if (chromeProcess && !chromeProcess.killed) {
    console.log('Shutting down headless Chrome...');
    chromeProcess.kill('SIGTERM');
    chromeProcess = null;
  }
}

// ─── Owned-tab cleanup ──────────────────────────────────────────
//
// When --no-headless reuses the operator's visible Chrome, this script opens a
// Gemini tab in a browser it does not own. Every failure path below signals with
// process.exit() — which runs no finally block and awaits no promise — so the
// async page.close() in main()'s finally never happens and the tab is stranded.
// A render that times out is the common case, so these piled up fast.
//
// Track the tab this run opened (only that one) and close it over CDP's
// synchronous HTTP endpoint from the exit handler. Self-contained on purpose:
// this skill should run as a standalone plugin resource.
// Set KEEP_CDP_TABS=1 to leave the tab open for debugging.
let ownedTargetId = null;

async function trackOwnedTab(context, page) {
  try {
    const session = await context.newCDPSession(page);
    const info = await session.send('Target.getTargetInfo');
    ownedTargetId = info?.targetInfo?.targetId ?? null;
    await session.detach().catch(() => {});
  } catch { /* best effort — the finally in main() still closes it normally */ }
}

function closeOwnedTabSync() {
  if (!ownedTargetId || process.env.KEEP_CDP_TABS === '1') return;
  const targetId = ownedTargetId;
  ownedTargetId = null;
  try {
    spawnSync('curl', ['-s', '--max-time', '2', `${CDP_URL}/json/close/${targetId}`], { stdio: 'ignore' });
  } catch { /* best effort at exit */ }
}

process.on('exit', () => { closeOwnedTabSync(); cleanupChrome(); });
process.on('SIGINT', () => { closeOwnedTabSync(); cleanupChrome(); process.exit(1); });
process.on('SIGTERM', () => { closeOwnedTabSync(); cleanupChrome(); process.exit(1); });

async function getCdpInfo(url) {
  try {
    const resp = await fetch(`${url}/json/version`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function isCdpReady(url) {
  return (await getCdpInfo(url)) !== null;
}

async function killExistingChrome() {
  try {
    const { execFileSync } = await import('child_process');
    const lsof = execFileSync('lsof', ['-ti', ':9222', '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
    if (lsof) {
      for (const pid of lsof.split('\n')) {
        console.log(`Killing non-headless Chrome (PID ${pid})...`);
        process.kill(parseInt(pid), 'SIGTERM');
      }
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (!(await isCdpReady(CDP_URL))) return;
      }
    }
  } catch { /* port already free */ }
}

async function launchHeadlessChrome() {
  const info = await getCdpInfo(CDP_URL);
  if (info) {
    const isHeadless = (info['User-Agent'] || '').includes('HeadlessChrome');
    if (isHeadless) {
      console.log('Headless Chrome already running, reusing.');
      return;
    }
    console.log('Found non-headless Chrome on port 9222, replacing with headless...');
    await killExistingChrome();
  }

  console.log(`Launching headless Chrome (profile: ${USER_DATA_DIR})...`);
  chromeProcess = spawn(requireChromePath(), [
    '--headless=new',
    `--remote-debugging-port=9222`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1280,900',
  ], { stdio: 'ignore' });

  chromeProcess.on('error', (err) => {
    console.error(`Failed to launch Chrome: ${err.message}`);
    process.exit(1);
  });

  for (let i = 0; i < 20; i++) {
    if (await isCdpReady(CDP_URL)) {
      console.log('Headless Chrome ready.');
      return;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  cleanupChrome();
  throw new Error('Headless Chrome failed to start within 10 seconds.');
}

async function main() {
  // --- Launch or connect to Chrome ---
  if (HEADLESS) {
    await launchHeadlessChrome();
  } else {
    // Non-headless: launch a visible Chrome for debugging
    const info = await getCdpInfo(CDP_URL);
    if (info) {
      console.log('Chrome already running on port 9222, reusing.');
    } else {
      console.log(`Launching visible Chrome for debugging (profile: ${USER_DATA_DIR})...`);
      chromeProcess = spawn(requireChromePath(), [
        `--remote-debugging-port=9222`,
        `--user-data-dir=${USER_DATA_DIR}`,
        '--no-first-run',
        '--window-size=1280,900',
      ], { stdio: 'ignore' });

      chromeProcess.on('error', (err) => {
        console.error(`Failed to launch Chrome: ${err.message}`);
        process.exit(1);
      });

      for (let i = 0; i < 20; i++) {
        if (await isCdpReady(CDP_URL)) {
          console.log('Visible Chrome ready.');
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!(await isCdpReady(CDP_URL))) {
        cleanupChrome();
        throw new Error('Chrome failed to start within 10 seconds.');
      }
    }
  }

  console.log(`Connecting to Chrome via CDP at ${CDP_URL}...`);
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  console.log(`Connected. Browser contexts: ${contexts.length}`);

  if (contexts.length === 0) {
    console.error('No browser contexts found. Is Chrome running with a profile?');
    await browser.close();
    process.exit(1);
  }

  const context = contexts[0];
  const page = await context.newPage();
  await trackOwnedTab(context, page);

  try {
    // --- Navigate to a fresh Gemini session ---
    console.log('Navigating to Gemini (fresh session)...');
    // Use timestamp param to bypass any cached conversation state
    await page.goto(`${GEMINI_URL}?ts=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Click "New chat" button to ensure a clean session.
    // IMPORTANT: do NOT include 'a[href="/app"]' here — that matches the Gemini
    // logo/home link, not the New Chat button. Clicking the logo navigates back
    // to /app but can still show the last conversation rather than a blank one.
    try {
      const newChatBtn = await page.$('button[aria-label*="New chat"], button[aria-label*="新對話"], button[aria-label*="新聊天"], a[aria-label*="New chat"]');
      if (newChatBtn) {
        console.log('Clicking New Chat for clean session...');
        await newChatBtn.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('No New Chat button found — assuming fresh session.');
      }
    } catch { /* already on fresh session */ }
    await page.waitForTimeout(2000);

    // --- Snapshot images visible BEFORE submitting (baseline) ---
    // Take this snapshot NOW, after navigation + New Chat attempt, before typing
    // anything. This captures any images already visible in the DOM (e.g., images
    // from a previous conversation that loaded if New Chat failed). The polling
    // loop will skip any src present here, ensuring we only accept images that
    // appeared as a direct result of THIS prompt submission.
    const IMAGE_SELECTOR = 'img[src*="lh3.googleusercontent"], img[src*="blob:"], img[src*="data:image"], img[src*="googleusercontent"], img[src*="ggpht"]';
    const preExistingSrcs = new Set(await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel))
        .filter(img => img.naturalWidth >= 256 && img.naturalHeight >= 256)
        .map(img => img.src);
    }, IMAGE_SELECTOR));
    if (preExistingSrcs.size > 0) {
      console.warn(`WARNING: ${preExistingSrcs.size} large image(s) already visible before prompt submission. New Chat may not have created a clean session. These will be excluded from polling.`);
    } else {
      console.log('Clean session confirmed: no pre-existing large images.');
    }

    const url = page.url();
    console.log(`Current URL: ${url}`);

    // Check for login redirect
    if (url.includes('accounts.google.com') || url.includes('signin')) {
      console.error('Not logged in — redirected to Google sign-in page.');
      console.error('First-time setup: open the debug Chrome manually, log into Google at gemini.google.com, then retry.');
      await page.screenshot({ path: '/tmp/gemini-cdp-login-error.png' });
      process.exit(1);
    }

    // --- Find the chat input ---
    console.log('Looking for Gemini chat input...');
    const inputSelectors = [
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      'textarea',
      '.ql-editor',
      '[aria-label*="prompt"]',
      '[aria-label*="Enter"]',
    ];

    let inputEl = null;
    for (const sel of inputSelectors) {
      try {
        inputEl = await page.waitForSelector(sel, { timeout: 5000 });
        if (inputEl) {
          console.log(`Found input: ${sel}`);
          break;
        }
      } catch { /* try next */ }
    }

    if (!inputEl) {
      console.error('Could not find Gemini chat input.');
      const bodyText = await page.textContent('body');
      console.error('Page text (first 500 chars):', bodyText?.substring(0, 500));
      await page.screenshot({ path: '/tmp/gemini-cdp-no-input.png' });
      process.exit(2);
    }

    // --- Type and submit the prompt ---
    console.log('Typing prompt...');
    await inputEl.click();
    await page.waitForTimeout(500);
    // Gemini uses a Quill rich text editor (ql-editor class).
    // Setting textContent directly does NOT trigger Quill's internal state update,
    // leaving the send button hidden (0x0 dimensions). Use execCommand('insertText')
    // via page.evaluate (not element handle) to properly trigger Quill's change
    // detection and enable the send button.
    // Prefix with "Generate an image:" so Gemini uses image generation mode.
    const fullPrompt = 'Generate an image: ' + promptText;
    const textLength = await page.evaluate((text) => {
      const el = document.querySelector('div.ql-editor[contenteditable="true"]')
        || document.querySelector('div[role="textbox"]')
        || document.querySelector('div[contenteditable="true"]');
      if (!el) return 0;
      el.focus();
      document.execCommand('insertText', false, text);
      return el.textContent.length;
    }, fullPrompt);
    console.log(`Text inserted (${textLength} chars)`);
    await page.waitForTimeout(2000);

    // --- Submit the prompt ---
    // Use Playwright's native .click() which dispatches proper mouse events
    // (mousedown, mouseup, click) that Angular Material responds to.
    // JS btn.click() via page.evaluate only fires a synthetic click event
    // which Angular's event listeners may ignore.
    console.log('Submitting...');
    const sendSelectors = [
      'button.send-button',
      'button[aria-label*="傳送"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="送出"]',
    ];
    let submitted = false;
    for (const sel of sendSelectors) {
      try {
        const sendBtn = await page.$(sel);
        if (sendBtn) {
          const box = await sendBtn.boundingBox();
          if (box && box.width > 0) {
            await sendBtn.click();
            console.log(`Clicked send button: ${sel}`);
            submitted = true;
            break;
          }
        }
      } catch { /* try next selector */ }
    }
    if (!submitted) {
      console.error('Could not find or click send button.');
      await page.screenshot({ path: '/tmp/gemini-cdp-no-send.png' });
      console.error('Debug screenshot: /tmp/gemini-cdp-no-send.png');
      process.exit(2);
    }
    await page.waitForTimeout(5000);

    // Verify the prompt was actually submitted by checking if the input cleared
    const inputAfterSubmit = await page.evaluate(() => {
      const el = document.querySelector('div.ql-editor[contenteditable="true"]')
        || document.querySelector('div[role="textbox"]');
      return el ? el.textContent.trim().length : -1;
    });
    if (inputAfterSubmit > 100) {
      console.error(`Warning: input still has ${inputAfterSubmit} chars — submit may have failed.`);
      await page.screenshot({ path: '/tmp/gemini-cdp-submit-check.png' });
    } else {
      console.log('Prompt submitted successfully (input cleared).');
    }

    // --- Poll for generated image ---
    console.log(`Waiting for image (up to ${TIMEOUT_SECONDS}s, polling every ${POLL_INTERVAL_MS / 1000}s)...`);

    for (let i = 0; i < MAX_POLLS; i++) {
      await page.waitForTimeout(POLL_INTERVAL_MS);
      process.stdout.write(`  Poll ${i + 1}/${MAX_POLLS}... `);

      const images = await page.$$(IMAGE_SELECTOR);

      for (const img of images) {
        const width = await img.evaluate(el => el.naturalWidth);
        const height = await img.evaluate(el => el.naturalHeight);

        if (width < 256 || height < 256) continue;

        const alt = await img.getAttribute('alt') || '';
        const src = await img.getAttribute('src') || '';

        // Skip any image that was already in the DOM before we submitted — this
        // prevents sidebar/history thumbnails from being mistaken for the new output.
        if (preExistingSrcs.has(src)) {
          console.log(`\n  Skipping pre-existing image: ${src.substring(0, 60)}...`);
          continue;
        }

        console.log(`\n  Found candidate: ${width}x${height}, alt="${alt.substring(0, 40)}", src=${src.substring(0, 60)}...`);

        // Try downloading with three fallback methods
        const buffer = await downloadImage(page, img, src);
        if (buffer && buffer.length > 1000) {
          mkdirSync(dirname(args.output), { recursive: true });
          writeFileSync(args.output, buffer);
          console.log(`\nSaved to ${args.output} (${buffer.length} bytes)`);
          return; // Success!
        }
      }

      console.log(images.length > 0 ? `${images.length} images, none large enough yet` : 'no images yet');
    }

    // Timeout — save debug info
    console.error(`\nTimeout: no suitable image found after ${TIMEOUT_SECONDS}s.`);
    await page.screenshot({ path: '/tmp/gemini-cdp-timeout.png' });
    console.error('Debug screenshot: /tmp/gemini-cdp-timeout.png');
    process.exit(3);

  } finally {
    // Reached only when control falls through normally; the process.exit() paths
    // above are covered by the exit handler. Clear the tracking only after the
    // close actually lands, so a failed close still falls back to the exit hook.
    if (process.env.KEEP_CDP_TABS === '1') {
      ownedTargetId = null;
    } else {
      try { await page.close(); ownedTargetId = null; } catch { /* exit hook retries */ }
    }
    await browser.close().catch(() => {});
    cleanupChrome();
  }
}

/**
 * Download an image element using multiple fallback strategies.
 * Returns a Buffer or null.
 */
async function downloadImage(page, imgHandle, src) {
  // Method 1: Playwright request (best for cross-origin CDN images)
  if (src.startsWith('http')) {
    try {
      const response = await page.request.get(src);
      const buffer = await response.body();
      if (buffer.length > 1000) {
        console.log('  Downloaded via page.request.get()');
        return buffer;
      }
    } catch (e) {
      console.log(`  page.request.get() failed: ${e.message}`);
    }
  }

  // Method 2: fetch() from page context
  try {
    const b64 = await imgHandle.evaluate(async (el) => {
      const resp = await fetch(el.src);
      const blob = await resp.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    });
    if (b64) {
      console.log('  Downloaded via page fetch()');
      return Buffer.from(b64, 'base64');
    }
  } catch (e) {
    console.log(`  page fetch() failed: ${e.message}`);
  }

  // Method 3: Canvas draw at natural resolution (works for blob: URLs, same-origin)
  try {
    const b64 = await imgHandle.evaluate(async (el) => {
      const canvas = document.createElement('canvas');
      canvas.width = el.naturalWidth;
      canvas.height = el.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(el, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    if (b64) {
      console.log('  Downloaded via canvas at natural resolution');
      return Buffer.from(b64, 'base64');
    }
  } catch (e) {
    console.log(`  canvas failed: ${e.message}`);
  }

  // Method 4: Element screenshot (lowest quality, last resort — captures CSS display size)
  try {
    const screenshotBuffer = await imgHandle.screenshot();
    if (screenshotBuffer.length > 1000) {
      console.log('  Captured via element screenshot (fallback)');
      return screenshotBuffer;
    }
  } catch (e) {
    console.log(`  element screenshot failed: ${e.message}`);
  }

  return null;
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(4);
});
