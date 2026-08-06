---
name: social-content-pipeline
description: Run the full Social Publish Kit pipeline from a canonical source.md to platform drafts, optional carousel prompts, rendered images, preview, and gated publishing. Use for "run the social pipeline", "content pipeline", "prepare this source for posting", "全流程", "幫我跑流程", or when a source.md should become review-ready social posts with optional images.
---

# Social Content Pipeline

Take a content directory from `source.md` to review-ready social posts, with one
human review gate before anything is published. This skill is the orchestrator:
it calls the other skills and the bundled workflow scripts instead of
re-implementing their internals.

The shape mirrors a two-stage content pipeline:

- **Stage 1: prepare locally** — create or update drafts, check them against the
  source, create optional image prompts, render missing PNGs when requested, and
  run the workflow preview. This stage commits, deploys, and publishes nothing.
- **Stage 2: publish after review** — after the user explicitly approves, run
  the browser publisher through `corepack yarn workflow --publish --yes`.

## Stage 1: Pick The Content Directory

- If the user supplies a `source.md` path, use its parent directory.
- If the user supplies `--content-dir` or names a content folder, use it.
- Otherwise inspect `content/*/source.md`, choose the most recently modified
  non-empty source, and announce the path before proceeding.

The directory layout is:

```text
content/<id>/
  source.md
  threads.md
  facebook.md
  linkedin.md
  slides/
    01-cover.prompt.txt
    01-cover.png
```

## Stage 2: Draft And Check

Use the skills as phase owners:

1. `platform-adapter` writes or updates `threads.md`, `facebook.md`, and
   `linkedin.md` from `source.md`.
2. `proofreading` applies Taiwan Traditional Chinese wording and formatting.
3. `source-crosscheck` verifies every platform draft against `source.md`.

Do not silently publish or deploy during this stage. If crosscheck reports
material drift, fix the draft and rerun the relevant check before continuing.

## Stage 3: Images

If the user asks for images, the source implies a carousel, or `slides/*.prompt.txt`
already exists:

1. Use `image-slides` to create or update `slides/*.prompt.txt` when prompts are
   missing or stale.
2. Use `image-gen` to render the prompts into sibling PNG files.

Provider choice:

- **Codex**: use the `image-gen` skill's Codex backend when the current runtime
  exposes an image generation tool.
- **Gemini**: use the local workflow command:

```text
corepack yarn image-gen --prompt-dir content/<id>/slides --provider gemini --no-headless
```

The bundled local command cannot render through Codex because Codex image
generation is a host tool, not a Node API. If Codex is requested from a local
shell-only context, switch to the `image-gen` skill path or use Gemini.

When `config.json` supplies `image_provider`, `image_profile_dir`,
`image_timeout_seconds`, or `image_chrome_path`, treat those as the default for
the local workflow. CLI flags override config.

## Stage 4: Preview

Run the preview command:

```text
corepack yarn workflow --content-dir content/<id>
```

If slide prompt files exist but PNGs are missing, either render them first or
run preview with image rendering:

```text
corepack yarn workflow --content-dir content/<id> --render-images --image-provider gemini
```

Stage 1 ends here. Present a compact review payload:

- `source.md`
- `threads.md`, `facebook.md`, `linkedin.md`
- `slides/*.prompt.txt` and rendered image paths
- crosscheck status and any unresolved caveats

## Review Gate

Ask the user whether to publish all, publish selected platforms, or stop after
local preparation. Apply any requested edits in place and rerun the relevant
checks before publishing.

Do not continue to Stage 2 until the user explicitly approves publishing. A
casual acknowledgement after a preview is not approval unless it clearly names
publishing or posting.

## Stage 5: Publish

After explicit approval, run:

```text
corepack yarn workflow --content-dir content/<id> --publish --yes
```

For selected platforms:

```text
corepack yarn workflow --content-dir content/<id> --platforms threads,linkedin --publish --yes
```

The workflow refuses to publish when:

- platform draft files are missing or over length;
- `config.json` has `publishers_enabled: false` and `--force` was not supplied;
- `slides/*.prompt.txt` exists but matching PNG files are missing.

## Report

Report:

- content directory;
- generated or updated platform files;
- rendered image count and missing images, if any;
- preview command result;
- publish result and any platform failures.
