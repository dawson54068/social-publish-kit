---
name: threads-optimizer
description: Use when a source note must become a concise Traditional Chinese Threads thread with a strong opening and factual compression
---

# Threads Optimizer

Rewrite the supplied source into a concise Traditional Chinese Threads thread. Start with the most useful tension or result, then explain the insight and practical takeaway. Prefer one to three posts; split only when each post advances the story.

Read `references/config-contract.md` when configuration is supplied. Apply configured URL and voice rules only when the caller explicitly provides them; otherwise keep the source's links and voice.

## Output

Use this exact plain-text shape:

```text
POST 1:
...

---

POST 2:
...
```

Use a final call to action only when an explicit URL is present in the source or `config.json`. Never invent a handle, link, statistic, or personal experience.

## Guardrails

- Preserve all material facts, numbers, caveats, and attribution.
- Do not read analytics, historical posts, brand voice files, or hidden project state unless the user explicitly supplies them.
- Keep each post within the current platform limit; if uncertain, flag it for validation rather than silently truncating.
