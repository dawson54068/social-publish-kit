#!/usr/bin/env python3
"""Validate LinkedIn main-post character count.

LinkedIn's hard cap is 3000 characters per post (the "Start a post" editor
rejects submission above that). The `linkedin.md` produced by linkedin-optimizer
contains the main post followed by an optional first-comment block separated by
`------- 首則留言 -------`. Only the main post is counted against the 3000 cap.

Exit code 0 = main post within limit, exit code 1 = over.

Usage:
    python3 validate-length.py <path-to-linkedin.md> [--limit 3000]
"""

import sys
import re
import argparse


COMMENT_SEP = re.compile(r'^-+\s*首則留言\s*-+\s*$', re.MULTILINE)


def split_main_and_comment(content: str) -> tuple[str, str]:
    """Return (main_post, first_comment). first_comment is empty if absent."""
    parts = COMMENT_SEP.split(content, maxsplit=1)
    main = parts[0].rstrip()
    comment = parts[1].strip() if len(parts) > 1 else ""
    return main, comment


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("filepath", help="Path to linkedin.md")
    parser.add_argument("--limit", type=int, default=3000)
    args = parser.parse_args()

    with open(args.filepath, encoding="utf-8") as f:
        content = f.read()

    main_post, first_comment = split_main_and_comment(content)
    main_len = len(main_post)
    comment_len = len(first_comment)

    print(f"File: {args.filepath}")
    print(f"Main post: {main_len} chars (limit {args.limit})")
    print(f"First comment: {comment_len} chars (no hard limit, soft target <1000)")

    if main_len > args.limit:
        over_by = main_len - args.limit
        print(f"FAIL: main post is {over_by} chars over the {args.limit}-char limit.")
        print("Trim the main post (move content to first comment, or cut filler).")
        print()
        print("VALIDATION_PASS=false")
        return 1

    print("PASS: main post within limit.")
    print()
    print("VALIDATION_PASS=true")
    return 0


if __name__ == "__main__":
    sys.exit(main())
