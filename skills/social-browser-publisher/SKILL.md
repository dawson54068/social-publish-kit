---
name: social-browser-publisher
description: Use when a beginner needs step-by-step help setting up an already logged-in browser session and publishing prepared social drafts to Threads, Facebook, or LinkedIn
---

# Social Browser Publisher

Guide a beginner through browser-based social publishing. The user should not need to understand cookies, CDP, Playwright, Node internals, or platform selectors.

## Safety model

Use a dedicated persistent browser profile for this package. Do not attach to, copy, inspect, or close the user's normal daily browser profile. The profile contains login cookies and must remain local, private, and outside Git. Never ask the user to paste cookies, passwords, access tokens, or session headers.

Publishing has three distinct stages:

1. **Setup:** install dependencies and open the dedicated profile.
2. **Preview:** validate the prepared drafts without opening a publisher.
3. **Publish:** require an explicit `--publish --yes` command after the user has reviewed the drafts.

## First-time setup

From the package root, run:

```text
corepack yarn install
corepack yarn playwright install chromium
corepack yarn setup-browser --platforms threads,facebook,linkedin
```

The setup command opens each platform in the dedicated profile. The user logs in manually, confirms the page is ready, and presses Enter in the terminal. The command does not read or export credentials.

On Windows, use `workflow\\setup-browser.cmd` or `workflow\\setup-browser.ps1`. To choose a profile location, set `SOCIAL_BROWSER_PROFILE_DIR` or pass `--profile-dir`. Use a different profile from the browser used for ordinary work.

## Daily publishing

The content directory must contain `threads.md`, `facebook.md`, and/or `linkedin.md` beside the canonical `source.md`.

Preview first:

```text
corepack yarn workflow --content-dir content/<id>
```

After checking the text, image order, links, and target platforms, publish explicitly:

```text
corepack yarn workflow --content-dir content/<id> --publish --yes
```

Do not add `--yes` merely to make a command non-interactive. It is the final confirmation that permits the browser to submit.

## Recovery

- If the browser shows a login page, stop and log in manually in the dedicated profile, then rerun the setup command.
- If a composer or submit button cannot be found, stop. Do not retry repeatedly, because a previous click may already have submitted the post. Inspect the page manually and update the selector only after confirming the post was not published.
- If one platform succeeds and a later platform fails, check the successful platform manually before rerunning. The workflow stops after the first failure to reduce duplicates.
- If a post was submitted but no URL was captured, do not republish blindly. Find the existing post first.

## What to report

Always report the selected platforms, content directory, preview/publish mode, and any platform that was skipped or failed. Never print cookies, profile contents, passwords, or tokens.
