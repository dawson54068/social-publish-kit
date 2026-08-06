/**
 * chunk-threads — split a plain-text body into Threads POSTs.
 *
 * Rule: each POST ≤ MAX_CHARS visible characters. Combine adjacent
 * paragraphs into the same POST greedily. Never split mid-sentence.
 *
 * CLI:
 *   tsx chunk-threads.ts < body.txt          # JSON array of strings on stdout
 *   tsx chunk-threads.ts --max 500 body.txt
 *
 * Library:
 *   import { chunkIntoPosts } from './chunk-threads.ts';
 *   const posts = chunkIntoPosts(body, 500);
 */

import { readFileSync } from 'fs';

const MAX_CHARS_DEFAULT = 500;

const SENTENCE_BOUNDARIES = /([.。?？!！])\s*/g;

/**
 * Visible character count. For Threads, code points map ~1:1 to displayed
 * characters; both ASCII and CJK count as 1 each. We use Array.from for
 * surrogate-pair safety on rare emoji.
 */
function visibleLength(s: string): number {
  return Array.from(s).length;
}

/**
 * Split a paragraph that's too long for one POST at the latest sentence
 * boundary before `max`. If no sentence ends in range, fall back to the
 * latest whitespace; if no whitespace, hard-cut at max (very rare).
 */
function splitOversizedParagraph(paragraph: string, max: number): string[] {
  const chunks: string[] = [];
  let remaining = paragraph;

  while (visibleLength(remaining) > max) {
    const window = Array.from(remaining).slice(0, max).join('');

    // Latest sentence-end within window
    let lastBoundary = -1;
    SENTENCE_BOUNDARIES.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_BOUNDARIES.exec(window)) !== null) {
      lastBoundary = m.index + m[0].length;
    }

    let cutAt: number;
    if (lastBoundary > 0) {
      cutAt = lastBoundary;
    } else {
      // Fall back to latest whitespace
      const wsMatch = window.match(/^(.*[\s　])[^\s　]*$/);
      cutAt = wsMatch ? wsMatch[1].length : max;
    }

    const head = Array.from(remaining).slice(0, cutAt).join('').trimEnd();
    chunks.push(head);
    remaining = Array.from(remaining).slice(cutAt).join('').trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

export function chunkIntoPosts(body: string, max: number = MAX_CHARS_DEFAULT): string[] {
  // Paragraphs are separated by blank line(s).
  const paragraphs = body
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const posts: string[] = [];
  let current = '';

  const flushCurrent = () => {
    if (current.length > 0) {
      posts.push(current);
      current = '';
    }
  };

  for (const para of paragraphs) {
    // Oversized single paragraph: split and treat each piece as its own POST candidate.
    const pieces = visibleLength(para) > max
      ? splitOversizedParagraph(para, max)
      : [para];

    for (const piece of pieces) {
      const joiner = current ? '\n\n' : '';
      const candidate = current + joiner + piece;
      if (visibleLength(candidate) <= max) {
        current = candidate;
      } else {
        flushCurrent();
        current = piece;
      }
    }
  }

  flushCurrent();
  return posts;
}

function parseArgs(argv: string[]): { max: number; filePath: string | null } {
  let max = MAX_CHARS_DEFAULT;
  let filePath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--max') {
      max = Number(argv[++i]);
    } else if (!argv[i].startsWith('--')) {
      filePath = argv[i];
    }
  }
  return { max, filePath };
}

function readBody(filePath: string | null): string {
  if (filePath) return readFileSync(filePath, 'utf8');
  return readFileSync(0, 'utf8'); // stdin
}

function main(): void {
  const { max, filePath } = parseArgs(process.argv.slice(2));
  const body = readBody(filePath);
  const posts = chunkIntoPosts(body, max);
  process.stdout.write(JSON.stringify(posts, null, 2) + '\n');
}

// Run when invoked directly (skip when imported).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
