# Social Publish Kit

Social Publish Kit is a portable plugin for social-writing workflows. It packages generic writing skills, image-generation skills, and a gated local browser workflow for drafting, validating, and optionally publishing Threads, Facebook, and LinkedIn posts.

It has no account tokens, private analytics, personal brand files, local absolute paths, or publisher-specific profile names.

## Plugin layout

This repository is structured as a shareable plugin:

- `.codex-plugin/plugin.json` describes the plugin for Codex-compatible installs.
- `.claude-plugin/plugin.json` describes the same skill bundle for Claude Code-compatible installs.
- `skills/` contains the portable skill folders.
- `workflow/` contains the optional local Node/Playwright runner.

## Included skills

- `platform-adapter` converts one canonical `source.md` into platform-specific drafts while preserving facts.
- `threads-optimizer`, `facebook-optimizer`, and `linkedin-optimizer` rewrite source material for each platform.
- `source-crosscheck` checks generated drafts against the canonical source before review or publishing.
- `proofreading` performs a Taiwan Traditional Chinese language and consistency pass.
- `image-prompt` and `image-slides` create text-accurate social image and carousel prompts.
- `image-gen` renders prompts into PNG files; it defaults to a Codex image tool when the host runtime exposes one and can use the Gemini browser-automation backend when requested or needed.
- `social-content-pipeline` runs the full source-to-drafts-to-images-to-preview workflow, then stops for human approval before publishing.
- `social-browser-publisher` guides local preview, login setup, and browser-based publishing.

## Safety model

`node workflow/run.mjs --content-dir content/<id>` validates and previews only. Nothing is published unless all of these are true:

1. The platform draft files exist and pass length checks.
2. `config.json` sets `publishers_enabled` to `true` (or `--force` is explicitly used).
3. The command includes both `--publish` and `--yes`.

The workflow uses a dedicated persistent Playwright browser profile. It does not attach to or close the user's normal Chrome profile. Log in to each platform once in that dedicated profile, then reuse it. Platform UIs change; inspect the browser manually if a selector error occurs.

## Setup

Requires Node.js 20+, Playwright, and `tsx` for the optional TypeScript helper. From this directory:

```text
corepack yarn install
corepack yarn playwright install chromium
```

For first-time browser login, run `corepack yarn setup-browser --platforms threads,facebook,linkedin`. It opens a separate persistent profile for manual login. This is the beginner-facing setup path; do not reuse or copy your ordinary daily browser profile.

Two unrelated things in this repository are called Gemini. Gemini CLI and Antigravity are host runtimes that read these skills and run the shell. The `image-gen` Gemini backend is Playwright automation against the Gemini web app. Running the kit inside Gemini CLI does not supply the image backend, and neither runtime is documented as exposing a host image generation tool, so expect `image-gen` to fall through to the browser backend there.

For the `image-gen` Gemini backend, log in to Gemini with the Chrome debug profile first. The default profile is `~/.chrome-debug-profile`; override it with `GEMINI_CHROME_PROFILE_DIR` or `--profile-dir`. This is a different profile from the publisher's dedicated Playwright profile, so the two need separate logins. The Codex backend depends on the host agent runtime exposing an image generation tool; it is not a local Node script.

Copy `config.example.json` to `config.json`, then change the values. Keep `config.json` private if it contains an account handle or internal URL.

The configuration contract is documented in `docs/config-contract.md`. It is the replacement for the original project's hard-coded domain, author, content ID, analytics, voice, and browser settings. The same skills work with no config at all; optional behavior is simply omitted.

See `docs/compatibility.md` for the difference between instruction compatibility and actual local-browser automation support across ChatGPT, Claude, Gemini CLI, and Antigravity.

## Install as a plugin

### Codex and Claude Code

When this repository is shared or cloned, install the plugin root through the plugin mechanism supported by your agent runtime. The plugin root is the repository directory containing `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `skills/`.

For runtimes that only support loose skill folders, copy or link the individual folders under `skills/` into the runtime's project or global skills directory.

### Gemini CLI and Antigravity

Neither runtime reads the plugin manifests. Both load individual skill folders, so the plugin-root install path above does not apply.

Clone the repository once, install the dependencies in that clone, then link the skill folders into the runtime's skills directory. Linking rather than copying matters: `workflow/run.mjs` and `package.json` live at the repository root, outside `skills/`, so a copied skill folder leaves `social-browser-publisher` with no package root to run.

```text
git clone <repository-url> ~/.agents/social-publish-kit
cd ~/.agents/social-publish-kit
corepack yarn install
corepack yarn playwright install chromium

# Gemini CLI, user scope
mkdir -p ~/.agents/skills
for d in skills/*/; do ln -sfn "$PWD/${d%/}" ~/.agents/skills/"$(basename "$d")"; done

# Antigravity, global scope
mkdir -p ~/.gemini/config/skills
for d in skills/*/; do ln -sfn "$PWD/${d%/}" ~/.gemini/config/skills/"$(basename "$d")"; done
```

Gemini CLI reads user skills from `~/.gemini/skills/` or `~/.agents/skills/`, and workspace skills from `.gemini/skills/` or `.agents/skills/`; within a tier the `.agents/` alias wins. Run `/skills list` to confirm discovery and `/skills reload` after editing a skill. `gemini skills install <git-url> --consent --path skills/<name> --scope user` also works, but it copies the folder out of the clone and therefore loses the root runner.

Antigravity has no install command or UI. Place or link the folders under workspace `.agents/skills/` or global `~/.gemini/config/skills/`; the global path is the one recognized by the IDE, the CLI, and the agent alike, and it is not the same directory as the Gemini CLI user alias.

Confirm that your installed version follows symlinks before depending on this layout. If it does not, copy the folders instead and run the workflow commands from the clone.

## Content layout

```text
content/<id>/
  source.md
  threads.md
  facebook.md
  linkedin.md
  slides/                # optional .prompt.txt, PNG, JPEG, WebP files
```

Use the bundled skills to create the drafts, then run:

```text
corepack yarn workflow --content-dir content/example
corepack yarn workflow --content-dir content/example --render-images --image-provider gemini
corepack yarn workflow --content-dir content/example --publish --yes
```

On Windows, use `workflow\\run.cmd` or `workflow\\run.ps1` with the same arguments. A custom browser profile can be supplied with `SOCIAL_BROWSER_PROFILE_DIR` or `--profile-dir`.

To render one image with the Gemini backend from the project root:

```text
node skills/image-gen/scripts/gemini-cdp-image.mjs --prompt-file content/example/slides/01-cover.prompt.txt --output content/example/slides/01-cover.png --no-headless
```

To render a whole `slides/` folder:

```text
corepack yarn image-gen --prompt-dir content/example/slides --provider gemini --no-headless
```

For Codex image generation, use the `image-gen` skill in an agent runtime that exposes an image generation tool. The local Node workflow only provides the Gemini browser-automation backend.

## Privacy boundary

Do not commit `config.json`, real content directories, browser profiles, screenshots, analytics, tokens, or publish results. The included `.gitignore` is a baseline, not a substitute for reviewing `git diff` before sharing.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes generic: no private account data, analytics, browser profiles, local usernames, hard-coded domains, or unpublished content.

## Security

Report security issues privately through the repository's security advisory channel. See [SECURITY.md](SECURITY.md). Do not open public issues containing credentials, cookies, browser profile contents, or private content.

## License

Released under the MIT License. See [LICENSE](LICENSE).
