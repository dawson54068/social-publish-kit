# Configuration Contract

The package is generic by default. A user may add a private `config.json` at the package root or beside a content directory. Skills may use only values explicitly present there.

```json
{
  "project_name": "Your Content Project",
  "content_root": "content",
  "site_url_template": "https://example.com/posts/{id}",
  "author_handle": "@your_handle",
  "platforms": ["threads", "facebook", "linkedin"],
  "cta_policy": "use_explicit_url_only",
  "analytics_file": null,
  "voice_file": null,
  "image_provider": "gemini",
  "image_profile_dir": null,
  "image_timeout_seconds": 300,
  "image_chrome_path": null,
  "browser_profile_dir": ".social-browser-profile",
  "publishers_enabled": false
}
```

`{id}` is replaced only when the caller supplies a content ID. `analytics_file` and `voice_file` are opt-in inputs; skills must not search for or infer them. `image_provider` may be `gemini` for the local browser renderer or `codex` for a host image-tool workflow. The local Node workflow can execute only the Gemini backend; Codex image generation must be performed by an agent runtime that exposes an image generation tool. `image_profile_dir` defaults to the Gemini renderer's `~/.chrome-debug-profile` when omitted. `publishers_enabled` defaults to false. Do not put passwords, access tokens, browser cookies, or private historical posts in this file.

When a field is absent, preserve the source text and omit the optional behavior. Never replace a missing value with a guessed domain, handle, author, metric, or account.
