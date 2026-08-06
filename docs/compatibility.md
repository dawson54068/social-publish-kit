# Compatibility Matrix

There are two different compatibility questions:

1. Can the agent install the plugin or read the bundled `SKILL.md` instructions?
2. Can the runtime execute Node/Playwright and access a local browser profile?

| Runtime | Install or read the skills | Run this package's local browser publisher |
|---|---|---|
| ChatGPT Skills | Yes, upload each skill/package where Skills is enabled | No general guarantee in ChatGPT web; use a local runner or an approved app/action for actual publishing |
| Claude Code | Yes, install as a plugin where `.claude-plugin/plugin.json` is supported, or copy skill folders into `.claude/skills` | Yes, with Node, Playwright, browser permissions, and local profile access |
| Claude.ai | Yes, upload/share the skills where supported | No general local-browser guarantee; the skill can guide a user or hand off to a local runner |
| Codex-compatible plugin runtime | Yes, install the repository root containing `.codex-plugin/plugin.json` | Yes, with shell consent, Node, Playwright, and local profile access |
| Gemini CLI | Yes, install/link the skill folders under `~/.gemini/skills`, `.gemini/skills`, or `.agents/skills` | Yes, with shell consent, Node, Playwright, and local profile access |
| Google Antigravity | Yes, install under workspace `.agents/skills` or its supported global skills directory | Yes, when its local agent has shell access and the required dependencies |

The preferred portable unit is the plugin root: the directory containing `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, `skills/`, `workflow/`, and docs. The fallback portable unit is an individual skill folder: `SKILL.md` plus resources inside that folder. Do not rely on package-root files from inside an individual skill. This package therefore duplicates the small config contract into each skill's `references/` directory.

The browser publisher is intentionally a local-runtime feature. A web chat session cannot be promised access to a user's `C:\` or `/Users/` filesystem, installed Node packages, or an already-authenticated browser profile. In those environments, use the skills to create and validate drafts, then run `workflow/run.mjs` on the user's own computer.

## Install locations

- Codex-compatible plugin runtimes: install the repository root as `social-publish-kit`.
- Claude Code: install the repository root as a plugin where supported; otherwise copy skill folders into `.claude/skills/` for a project or `~/.claude/skills/` globally.
- Gemini CLI: use `gemini skills install <path-or-url>` or link the skill folders into `~/.gemini/skills/`; `.agents/skills/` is also supported.
- Antigravity: use workspace `.agents/skills/` or the global location documented by the installed version.
- ChatGPT Skills and Claude.ai: upload the individual skill folders or the supported package through their Skills UI; do not upload browser profiles, `config.json`, content, or `node_modules`.
