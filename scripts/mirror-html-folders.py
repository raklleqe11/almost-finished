#!/usr/bin/env python3
"""Mirror /public/foo.html → /public/foo/index.html so trailing-slash URLs
work for the prebuilt static pages (the nav links inside the HTML use
`/daily-catch-saranda/` style URLs)."""
import shutil
from pathlib import Path

ROOT = Path("/dev-server/public")

# HTML files at the root of /public to mirror. Skip site-level files and
# any that already have a directory counterpart.
SKIP = {"index.html"}

created = []
skipped = []

for html in sorted(ROOT.glob("*.html")):
    name = html.name
    if name in SKIP:
        continue
    slug = name[:-5]  # drop .html
    target_dir = ROOT / slug
    target = target_dir / "index.html"
    if target.exists():
        skipped.append(slug)
        continue
    target_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(html, target)
    created.append(slug)

print(f"Created {len(created)} directory mirrors:")
for s in created:
    print(f"  /{s}/")
if skipped:
    print(f"Skipped (already existed): {skipped}")
