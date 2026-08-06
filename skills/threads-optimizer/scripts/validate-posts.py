#!/usr/bin/env python3
"""Validate Threads posts character count.

Parses a threads.md file, counts characters per post, and reports violations.
Exit code 0 = all posts within limit, exit code 1 = violations found.

Usage:
    python3 validate-posts.py <path-to-threads.md> [--limit 500]
"""

import re
import sys
import argparse


def parse_posts(content: str) -> list[tuple[int, str]]:
    """Split content by POST separators, return list of (post_number, text)."""
    # Accept both the legacy dashed format and the shareable format:
    # POST 1:\n...\n---\nPOST 2:\n...
    marker = re.compile(r'(?im)^\s*POST\s+(\d+)\s*:\s*\n?')
    matches = list(marker.finditer(content))
    posts = []
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        text = content[match.end():end]
        text = re.sub(r'^\s*-{3,}\s*$', '', text, flags=re.MULTILINE).strip()
        posts.append((int(match.group(1)), text))
    if not posts:
        legacy = re.compile(r'(?im)^\s*-{3,}\s*POST\s+(\d+)\s*-{3,}\s*$')
        matches = list(legacy.finditer(content))
        for i, match in enumerate(matches):
            end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            posts.append((int(match.group(1)), content[match.end():end].strip()))
    return posts


def validate(filepath: str, limit: int = 500) -> list[dict]:
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    posts = parse_posts(content)
    violations = []

    print(f"File: {filepath}")
    print(f"Limit: {limit} chars")
    print(f"Posts found: {len(posts)}")
    print()

    for post_num, text in posts:
        char_count = len(text)
        over = char_count - limit
        status = "OVER" if over > 0 else "OK"
        bar = "#" * min(char_count * 40 // limit, 50)

        print(f"  POST {post_num}: {char_count:>4} chars  [{bar}] {status}"
              + (f" (+{over})" if over > 0 else ""))

        if over > 0:
            violations.append({
                "post": post_num,
                "chars": char_count,
                "over": over,
                "preview": text[:80] + "..." if len(text) > 80 else text,
            })

    print()

    if violations:
        print(f"FAIL: {len(violations)} post(s) exceed {limit} chars")
        for v in violations:
            print(f"  POST {v['post']}: {v['chars']} chars (+{v['over']} over)")
            print(f"    Preview: {v['preview']}")
        print()
        print("VALIDATION_PASS=false")
        return violations
    else:
        print(f"PASS: All {len(posts)} posts within {limit} char limit")
        print()
        print("VALIDATION_PASS=true")
        return []


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate Threads post character counts")
    parser.add_argument("file", help="Path to threads.md file")
    parser.add_argument("--limit", type=int, default=500, help="Character limit per post (default: 500)")
    args = parser.parse_args()

    violations = validate(args.file, args.limit)
    sys.exit(1 if violations else 0)
