---
name: platform-adapter
description: Use when a canonical source document must become platform-specific social drafts while preserving facts and substance
---

# Platform Adapter

Treat `source.md` as the only source of truth. Create plain-text drafts for Threads, Facebook, and LinkedIn with the smallest structural changes required by each platform. Do not invent facts, claims, links, metrics, or personal details.

## Input

The content directory must contain `source.md`. Optional files are `config.json` and `assets/` or `slides/`. A project may use any directory naming scheme; do not assume `dayNN`.

Use `references/config-contract.md` for project-specific values. Configuration changes links, handles, voice, and enabled platforms; it does not override the source-of-truth rule.

## Output

Write `threads.md`, `facebook.md`, and/or `linkedin.md` beside `source.md`. Keep platform files plain text. Use `config.json` only for explicit values such as `site_url_template`, `author_handle`, and enabled platforms.

## Rules

- Preserve the author's meaning, numbers, caveats, and source links.
- Remove Markdown syntax that the target platform will not render.
- Threads: split into short posts; each post must stand alone enough to make the thread understandable.
- Facebook: write one self-contained post; put optional external links in a clearly labelled first comment file only when requested.
- LinkedIn: write a professional but personal post; do not turn a learning note into corporate marketing copy.
- Never derive URLs from a user's filesystem, account name, or historical manifest. Use only an explicit URL from the source or config.
- If a required value is missing, leave a visible placeholder such as `[ADD_LINK]` and report it.

## Validation

Run the bundled Threads validator when producing `threads.md`:

```bash
corepack yarn tsx scripts/chunk-threads.ts --help
python scripts/validate-posts.py path/to/threads.md
```
