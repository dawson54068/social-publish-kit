---
name: linkedin-optimizer
description: Use when a source note must become a concise, professional but personal Traditional Chinese LinkedIn post
---

# LinkedIn Optimizer

Rewrite the supplied source into a self-contained Traditional Chinese LinkedIn post. Explain the problem, insight, result, and transferable lesson. Keep the tone personal and specific; do not turn a learning note into corporate copy.

Read `references/config-contract.md` when configuration is supplied. Use an explicitly configured `voice_file` or `analytics_file` only when the caller asks for those inputs; do not scan the project for personal history.

## Output

Return plain text with readable paragraphs. Use an explicit call to action only when the source or `config.json` provides a URL. Never invent a profile, employer, metric, site, or credential.

## Guardrails

- Preserve facts, numbers, dates, caveats, and attribution.
- Do not use private analytics or historical-post files as hidden context.
- Keep technical details needed to understand the lesson; compress the rest.
- Validate length before publishing and report anything that must be shortened.
