---
name: source-crosscheck
description: Use when social drafts need verification against a canonical source before review or publishing
---

# Source Crosscheck

Compare every generated social draft with the supplied `source.md`. Report additions, omissions, changed numbers, changed attribution, unsupported certainty, and altered URLs. Do not silently repair the draft: show the issue and the source/draft excerpts so the author can decide.

If a `config.json` is supplied, treat its explicitly listed URLs and author fields as allowed context. Do not treat hidden files, local usernames, or historical analytics as evidence.

## Procedure

1. Read the complete source and every requested draft.
2. Build a compact fact inventory: people, products, dates, numbers, steps, outcomes, limitations, and links.
3. Check each draft against that inventory.
4. Distinguish harmless compression from a meaning change.
5. End with `PASS` only when no material discrepancy remains. Otherwise end with `BLOCKED` and list the exact fixes.

Never flag a deliberately omitted detail as a hallucination. Never invent a URL or infer a personal identity from the filesystem.
