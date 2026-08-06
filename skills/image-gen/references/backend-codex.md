# Codex Backend

Use this backend when the current runtime exposes a Codex-compatible image
generation tool. In Codex API sessions this may be an `image_gen` tool. In
other runtimes it may be an equivalent host capability. The provider is not a
shell command and this plugin does not bundle a raw OpenAI Images API client.

## Preconditions

- The host runtime exposes an image generation tool in the active tool list.
- The caller supplied an inline prompt or a readable `.prompt.txt` file.
- The caller supplied an explicit `.png` output path.

If no image tool is exposed, do not pretend this backend is available. Switch to
the Gemini backend instead.

## Single Image

1. Read the prompt exactly as supplied.
2. Use the host image generation tool once for that prompt.
3. Honor the size stated in the first sentence; default to square `1024x1024`
   if no size is stated.
4. Save the resulting image bytes to the requested output path.
5. Verify that the output path exists and is non-empty.

The rendering instruction should include:

```text
Generate one PNG from this prompt. Save it to <absolute output path>. Do not
invent text content; render exactly what the prompt specifies. Honor the stated
size, or default to square 1024x1024 when size is unspecified.
```

## Batch

Build the work list from `*.prompt.txt` files:

```text
for each prompt file:
  output = same path with ".prompt.txt" replaced by ".png"
  skip when output exists unless regeneration was requested
  render prompt -> output
  continue after failures
```

Parallelize only when the host runtime supports independent image tool calls.
If not, render sequentially and say so in the summary.

## Verification

After each render, confirm:

- The output file exists.
- The file size is greater than zero.
- Dimensions are checked when the runtime exposes image metadata or local
  tooling such as `sips`, `file`, or ImageMagick.

If the tool returns an image but does not write it to disk automatically, the
agent must write the returned bytes to the requested path. Do not leave the PNG
missing and call the task complete.

## Fallback

Use the Gemini backend when:

- The Codex image tool is unavailable.
- The image tool errors or hits quota.
- Repeated attempts garble required on-image Chinese text.

Surface an error only when both Codex and Gemini fail.
