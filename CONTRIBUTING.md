# Contributing to Social Publish Kit

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies:

   ```bash
   corepack yarn install
   corepack yarn playwright install chromium
   ```

3. Run the preview check:

   ```bash
   corepack yarn run check
   ```

## Making Changes

1. Create a branch with a short descriptive name.
2. Keep the package generic. Do not add private account data, analytics, browser profiles, local usernames, hard-coded domains, or unpublished content.
3. Add or update docs when behavior changes.
4. Run the relevant checks before opening a pull request:

   ```bash
   corepack yarn run check
   ```

## Pull Requests

- Describe what changed and why.
- Keep pull requests focused.
- Include reproduction steps for bug fixes.
- Confirm that no secrets, credentials, browser profile files, screenshots, private content, or personal data are included.

## Reporting Bugs and Requesting Features

Use the issue templates when available. For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
