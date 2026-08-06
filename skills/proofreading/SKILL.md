---
name: proofreading
description: Use when Traditional Chinese social content needs a final language, terminology, consistency, or formatting pass
---

# Traditional Chinese Proofreading

Proofread for Taiwan Traditional Chinese. Preserve the author's sharing and learning voice. Fix typos, Mainland terminology, punctuation, duplicated wording, inconsistent names, and obvious grammar errors without adding substance or changing claims.

If the caller supplies a `voice_file`, read it through the shared configuration contract. Otherwise preserve the voice visible in the current source; do not infer a private author's style from the machine.

## Checks

- Keep product names, code, URLs, commands, and numbers exact.
- Keep platform files plain text; do not add Markdown headings or emphasis markers.
- Use the bundled term mapping only as a vocabulary reference, never as permission to rewrite meaning.
- Report any ambiguity that cannot be resolved from the source.
