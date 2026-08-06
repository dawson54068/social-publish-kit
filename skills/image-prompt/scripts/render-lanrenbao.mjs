#!/usr/bin/env node
/**
 * render-lanrenbao.mjs
 *
 * Renders a 懶人包 infographic from JSON data using Playwright + HTML template.
 *
 * Usage:
 *   node render-lanrenbao.mjs --data data.json --output cover.png
 *   echo '{"title":"...","panels":[...]}' | node render-lanrenbao.mjs --output cover.png
 *
 * Data format (JSON):
 * {
 *   "title": "主標題",
 *   "bgGradient": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
 *   "date": "2026.03.30",
 *   "author": "Ci",
 *   "panels": [
 *     {
 *       "icon": "🔒",
 *       "panelTitle": "Manual Review",
 *       "subtitle": "每次都問",
 *       "points": ["安全但煩", "93% 直接按同意"],
 *       "color": "#4ade80",
 *       "accent": "#22c55e"
 *     },
 *     {
 *       "icon": "🤖",
 *       "panelTitle": "Auto Mode",
 *       "subtitle": "智慧判斷",
 *       "points": ["兩層分類器", "安全的放行、危險的攔截"],
 *       "color": "#60a5fa",
 *       "accent": "#3b82f6",
 *       "highlight": true,
 *       "tag": "推薦 ✓"
 *     }
 *   ]
 * }
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, '../templates/lanrenbao.html');

const { values: args } = parseArgs({
  options: {
    data:   { type: 'string' },
    output: { type: 'string' },
  },
});

async function readData() {
  if (args.data) {
    return JSON.parse(readFileSync(resolve(args.data), 'utf-8'));
  }
  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function main() {
  const data = await readData();
  const outputPath = resolve(args.output || 'lanrenbao.png');

  // This launches its own browser rather than attaching to the operator's Chrome,
  // so nothing here can touch their tabs — but a throw mid-render used to skip
  // browser.close() and strand a headless Chrome process. The finally fixes that.
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

    // Load template
    await page.goto(`file://${TEMPLATE}`, { waitUntil: 'load' });

    // Inject data and render
    await page.evaluate((d) => render(d), data);

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Auto-size: measure actual content height
    const bodyHeight = await page.evaluate(() => {
      const body = document.body;
      return body.scrollHeight + 20; // small padding
    });

    await page.setViewportSize({ width: 1200, height: bodyHeight });

    // Screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png',
    });

    console.log(`懶人包 rendered → ${outputPath} (1200x${bodyHeight})`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
