---
name: facebook-optimizer
description: Use when a source note must become a self-contained Traditional Chinese Facebook post with a clear hook and optional call to action
---

# Facebook Optimizer

Rewrite the supplied source into a self-contained Facebook post in Traditional Chinese. Preserve the source facts and sharing/learning voice. The reader should understand the problem, insight, result, and practical takeaway without opening another site.

Read `references/config-contract.md` when configuration is supplied. Use `site_url_template`, `author_handle`, `cta_policy`, and an explicitly configured `voice_file` only; never infer these values from local paths or account history.

## Output

Return only the post text unless the caller asks for analysis. Use short paragraphs and plain text. Add a call to action only when the source or `config.json` contains an explicit link. Never invent a personal site, handle, project name, result, or performance claim.

## Guardrails

- Do not mention private paths, local usernames, analytics files, or unpublished account data.
- Keep technical detail that is necessary to understand the takeaway; compress optional implementation detail.
- Keep URLs exactly as supplied.
- If the source contains insufficient evidence for a claim, state the limitation instead of strengthening it.
