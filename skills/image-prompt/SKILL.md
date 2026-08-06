---
name: image-prompt
description: Use when a Traditional Chinese social post needs a text-accurate infographic or cover image prompt
---

# Social Image Prompt

Create a production-ready raster-image prompt from the supplied content. Render all specified Traditional Chinese text exactly; do not paraphrase, correct, or invent copy inside the image. Keep the layout readable on a phone and reserve a safe margin around text.

Read `references/config-contract.md` when configuration is supplied. Use only explicitly configured branding values and never pull a watermark or signature from local files.

## Required output

Return the prompt plus the requested aspect ratio and output path. If using the bundled renderer, run its help command first and pass the output path explicitly. A personal handle, domain, logo, or watermark may appear only when explicitly supplied.
