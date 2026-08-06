# Gemini Backend

Use this backend when the user asks for Gemini, when Codex image generation is
not exposed in the current runtime, or when Codex repeatedly fails. This backend
drives Gemini in Chrome through Playwright CDP and saves the generated image.

## Preconditions

- Node.js 20+ is available.
- Playwright dependencies are installed for this plugin.
- Google Chrome or Chromium is installed.
- The Chrome debug profile is logged into Gemini.

The default profile is `~/.chrome-debug-profile`. Override it with
`--profile-dir <path>` or `GEMINI_CHROME_PROFILE_DIR=<path>`.

Use `--no-headless` for normal authenticated runs. That lets the script use or
launch the visible debug-profile Chrome. Do not pre-check Chrome with `lsof` or
`curl` and abort early; run the command and let the script connect or launch.

## Script

Resolve the script relative to this skill directory:

```text
skills/image-gen/scripts/gemini-cdp-image.mjs
```

Supported flags:

| Flag | Meaning |
|---|---|
| `--prompt "text"` | Prompt as inline text |
| `--prompt-file path.prompt.txt` | Prompt read from a file |
| `--output path.png` | Required output path |
| `--no-headless` | Use or launch visible Chrome with the debug profile |
| `--profile-dir path` | Chrome user data directory; defaults to `~/.chrome-debug-profile` |
| `--chrome-path path` | Chrome/Chromium executable path when auto-detection is wrong |
| `--timeout 300` | Per-image wait time in seconds |

## Single Image

From the plugin root:

```bash
node skills/image-gen/scripts/gemini-cdp-image.mjs \
  --prompt-file /path/to/image.prompt.txt \
  --output /path/to/image.png \
  --no-headless \
  --timeout 300
```

When the plugin is installed as a loose skill, replace `skills/image-gen` with
the installed skill folder path.

## Batch

Gemini uses one shared browser session, so render sequentially:

```bash
for f in /path/to/prompts/*.prompt.txt; do
  out="${f%.prompt.txt}.png"
  if [ -f "$out" ]; then
    echo "skip $(basename "$out") (exists)"
    continue
  fi
  node skills/image-gen/scripts/gemini-cdp-image.mjs \
    --prompt-file "$f" \
    --output "$out" \
    --no-headless \
    --timeout 300 \
    || echo "FAILED: $f"
done
```

The `|| echo` keeps the loop running if one prompt fails.

## Verification

Confirm one PNG exists for every prompt. To regenerate a single image, delete
its PNG and run the command again. The batch loop fills only missing PNGs unless
the user asks to overwrite existing outputs.

## Notes

- Gemini prioritizes the beginning of the prompt; put the shape and style in
  the opening sentence.
- Keep on-image Chinese concise. Long strings are more likely to be garbled.
- Do not append `--ar` flags to the prompt. State the desired shape in prose.
