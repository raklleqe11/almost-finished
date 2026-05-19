#!/usr/bin/env python3
"""Inject Google Analytics, favicon, and og:image into all HTML pages that lack them."""
from pathlib import Path
import re

ROOT = Path("/dev-server/public")
GA_ID = "G-P6Y6CX8DBX"
OG_IMAGE = "https://freshfish.al/images/fresh-fish-shop-ardit-saranda-hero.webp"

GA_MARKER = "<!--ga-v1-->"
GA_SNIPPET = f"""{GA_MARKER}
<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>
"""

FAV_MARKER = "<!--fav-v1-->"
FAV_SNIPPET = f"""{FAV_MARKER}
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
"""

OG_MARKER = "<!--ogimg-v1-->"
OG_SNIPPET = f"""{OG_MARKER}
<meta property="og:image" content="{OG_IMAGE}">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
"""

ga_added = fav_added = og_added = 0
total = 0

for path in ROOT.rglob("*.html"):
    total += 1
    text = path.read_text(encoding="utf-8")
    original = text
    if "</head>" not in text:
        continue

    inject = ""
    if "gtag/js?id=" not in text and GA_MARKER not in text:
        inject += GA_SNIPPET
        ga_added += 1
    if FAV_MARKER not in text and 'rel="icon"' not in text and "rel='icon'" not in text:
        inject += FAV_SNIPPET
        fav_added += 1
    if OG_MARKER not in text and 'property="og:image"' not in text:
        inject += OG_SNIPPET
        og_added += 1

    if inject:
        text = text.replace("</head>", inject + "</head>", 1)

    if text != original:
        path.write_text(text, encoding="utf-8")

print(f"Files scanned: {total}")
print(f"GA added:      {ga_added}")
print(f"Favicon added: {fav_added}")
print(f"og:image added:{og_added}")
