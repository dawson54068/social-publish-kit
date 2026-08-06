---
name: image-gen
description: Render text prompts into standalone PNG files using Codex image generation by default or Gemini browser automation when requested or needed. Use whenever the user wants to create, generate, draw, or render an image from a prompt, including Traditional Chinese social images and image-slides carousel prompt folders. Not for deterministic HTML infographic rendering; use image-prompt for that.
---

# Image Gen

Render a text prompt into a PNG. This skill owns image **generation**; `image-prompt`
and `image-slides` own prompt planning. Do not invent content while rendering. If
the prompt specifies on-image text, preserve that text exactly.

## Providers

| Provider | How it renders | Use when | Needs |
|---|---|---|---|
| Codex | The current host runtime's image generation tool | Default choice, or whenever the user asks for Codex/GPT image generation | A runtime that exposes an image generation tool |
| Gemini | `scripts/gemini-cdp-image.mjs` driving Gemini in a Chrome debug profile | User asks for Gemini, Codex is unavailable, or Codex repeatedly garbles typography | Node, Playwright, Chrome, and a logged-in Gemini browser profile |

Default to Codex. Switch to Gemini when the user asks for Gemini, when the
Codex image tool is not exposed in the current runtime, or when Codex fails.
Only report a hard failure after the selected provider and any fallback both
fail to produce the expected PNG.

Do not use raw OpenAI or Gemini API-key code unless the user explicitly asks
for an API implementation. In this plugin, Codex is a host-tool provider and
Gemini is a browser-automation provider.

## Contract

### Single Image

- Input: an inline prompt or a `.prompt.txt` file, plus an explicit output
  `.png` path.
- Output: exactly one PNG at that path.
- Default size: square `1024x1024` when the prompt does not specify size.

### Batch

- Input: a directory containing `*.prompt.txt` files.
- Output: one sibling `*.png` next to each prompt, using the same basename.
- Idempotence: skip an existing PNG unless the user asks to regenerate.
- Fault isolation: one failed prompt must not abort the rest of the batch.

Batch mode is single-image mode applied per prompt file with the same provider
and the same verification step.

## Prompt Rules

- Put size and shape in the first sentence: `Square 1:1`, `Square 1024x1024`,
  `16:9 wide`, `Portrait 3:4`, or `Wide banner 1500x500`.
- Do not append CLI-style image flags such as `--ar 1:1`; image providers may
  render them as literal text or ignore them.
- Lead with subject and style, then composition, then any on-image text.
- Keep on-image Chinese short. Long Chinese strings are more likely to be
  garbled by either provider; split dense copy across slides when possible.
- For a coherent set, repeat the shared palette, type style, signature, and
  layout rules in every prompt. Providers are stateless across calls.

## Provider Instructions

After choosing a provider, read exactly one backend reference:

- Codex provider: `references/backend-codex.md`
- Gemini provider: `references/backend-gemini.md`

Use Codex first unless the user names Gemini. If Codex cannot run because the
host image tool is unavailable, read the Gemini backend and continue there.

## Verify And Report

After rendering, verify every expected output path:

- The PNG exists.
- The file is non-empty.
- When local tools are available, dimensions match the requested shape or the
  default `1024x1024`.

For batch work, never report "done" when any prompt is missing its PNG. Retry
missing outputs with the fallback provider or list the exact failed paths and
failure reasons.
