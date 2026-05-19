#!/usr/bin/env python3
"""Fix broken rgba() values and add mobile polish to all static HTML pages."""
import re
from pathlib import Path

ROOT = Path("/dev-server/public")

# Fix 1: rgba(R,G,B.NN) -> rgba(R,G,B,.NN)
RGBA_BROKEN = re.compile(r"rgba\((\d+),(\d+),(\d+)\.(\d+)\)")

# Fix 2: ".blog-body ul.blog-body ol" -> ".blog-body ul,.blog-body ol"
BLOG_BODY_SEL = ".blog-body ul.blog-body ol"
BLOG_BODY_FIX = ".blog-body ul,.blog-body ol"

# Mobile polish — appended once before </head> on every page. Marker prevents
# re-injection if the script is run again.
MARKER = "<!--mobile-polish-v1-->"
MOBILE_POLISH = MARKER + """
<style>
/* Mobile polish — additive overrides, safe to remove */
h1,h2,h3{text-wrap:balance}
.hero-sub,.lead,.info-hero p,.cta-band p{text-wrap:pretty}
@media(max-width:640px){
  .hero{min-height:440px}
  .hero-content{padding:28px 18px}
  .hero h1{font-size:clamp(24px,7.5vw,34px);line-height:1.18}
  .hero-sub{font-size:15px;margin-bottom:22px}
  .hero-btns{flex-direction:row;gap:10px}
  .hero-btns .btn-primary,.hero-btns .btn-secondary{flex:1 1 auto;text-align:center;padding:12px 14px;font-size:14px;white-space:nowrap}
  .section-inner{padding:44px 18px}
  h2{font-size:clamp(22px,6vw,28px)}
  .lead{font-size:16px}
  .trust-inner{padding:12px 18px;gap:8px 16px}
  .trust-item{font-size:12.5px}
  .cta-band{padding:40px 18px}
  .cta-band p{font-size:15px}
  .info-hero{padding:44px 18px}
  .info-hero h1{font-size:clamp(24px,6.5vw,32px)}
  .info-hero p{font-size:16px}
  .blog-hero{padding:40px 18px 30px}
  .blog-hero h1{font-size:clamp(22px,6.2vw,30px)}
  .blog-body{padding:32px 18px}
  .blog-body h2{font-size:21px;margin-top:28px}
  .blog-body h3{font-size:18px}
  .blog-card h3{font-size:16px}
  .lang-bar{font-size:11.5px;padding:5px 8px}
  .lang-bar a{margin:0 6px}
  .footer-inner{gap:28px;margin-bottom:28px}
  .price-table{font-size:14px}
  .price-table th,.price-table td{padding:9px 10px}
}
@media(max-width:380px){
  .hero h1{font-size:22px}
  .hero-btns{flex-direction:column}
  .hero-btns .btn-primary,.hero-btns .btn-secondary{width:100%}
}
</style>
"""

fixed_rgba = 0
fixed_blog_sel = 0
injected = 0

for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    original = text

    # Fix broken rgba
    new_text, n = RGBA_BROKEN.subn(r"rgba(\1,\2,\3,.\4)", text)
    if n:
        fixed_rgba += n
        text = new_text

    # Fix blog-body selector typo
    if BLOG_BODY_SEL in text:
        text = text.replace(BLOG_BODY_SEL, BLOG_BODY_FIX)
        fixed_blog_sel += 1

    # Inject mobile polish once, right before </head>
    if MARKER not in text and "</head>" in text:
        text = text.replace("</head>", MOBILE_POLISH + "</head>", 1)
        injected += 1

    if text != original:
        path.write_text(text, encoding="utf-8")

print(f"rgba fixes:        {fixed_rgba}")
print(f"blog selector fix: {fixed_blog_sel} files")
print(f"mobile polish:     {injected} files")
