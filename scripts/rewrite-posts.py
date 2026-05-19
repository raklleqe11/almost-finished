#!/usr/bin/env python3
"""Rewrite IT and SQ blog posts for diacritics + length via Lovable AI Gateway."""
import os, re, sys, json, time, glob, pathlib, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

API = "https://ai.gateway.lovable.dev/v1/chat/completions"
KEY = os.environ["LOVABLE_API_KEY"]
MODEL = "google/gemini-2.5-flash"

PROMPT_IT = """You are a native Italian copywriter for a fresh-fish market in Sarandë, Albania.

I will give you the <main>...</main> block of an Italian blog post. Rewrite it with these STRICT rules:

1. Output ONLY the rewritten <main>...</main> block. No prose before or after. No code fences.
2. Preserve EVERY HTML tag, attribute, class, href, src, image, and link exactly as-is. Do not add or remove tags.
3. Rewrite the human-readable Italian text inside <h1>, <h2>, <h3>, <p>, <li>, <strong>, <em>, breadcrumbs, kicker.
4. Use NATIVE, IDIOMATIC Italian with PROPER diacritics: è, à, ù, ì, ò, é. Words like "perché", "città", "più", "così", "è", "qualità", "località", "pescheria", "freschezza" must carry their accents. NEVER write "perche", "citta", "piu", "cosi", "e" (when meaning "is"), "qualita".
5. Keep Albanian place names spelled correctly with diacritics: Sarandë, Ksamil, Butrint, Vlorë.
6. Expand the body so the total readable text in <p> and <li> elements is approximately 320-380 words. Add useful, concrete detail — sensory descriptions, practical tips for tourists, mentions of Ionian sea, morning catch, Fish Shop Ardit at Rruga Idriz Alidhima 230, hours 08:30–22:00.
7. Naturally weave in at least ONE of these long-tail phrases somewhere in the body (do not list them, integrate into a sentence): "pesce fresco vicino a me", "pescheria vicino a me", "mercato del pesce vicino a me a Sarandë", "pesce fresco a Saranda". Keep it sounding human, not stuffed.
8. Keep the same overall structure (same h1, same number of h2 sections roughly, same images in same positions, same internal links, same CTA box and related-reading and footer untouched). You may add 1-2 new <p> paragraphs inside existing sections to hit the word count.
9. Keep the same factual claims (Ardit shop, address, phone +355698967528, Saranda location). DO NOT mention any "Adidas store" or any specific neighbouring business — just the address and "one block from the seafront promenade" if a landmark is needed.
10. Do not invent prices, awards, certifications.

Here is the <main> block:

"""

PROMPT_SQ = """You are a native Albanian copywriter for a fresh-fish market in Sarandë, Albania.

I will give you the <main>...</main> block of an Albanian blog post. Rewrite it with these STRICT rules:

1. Output ONLY the rewritten <main>...</main> block. No prose before or after. No code fences.
2. Preserve EVERY HTML tag, attribute, class, href, src, image, and link exactly as-is.
3. Rewrite the human-readable Albanian text inside <h1>, <h2>, <h3>, <p>, <li>, <strong>, <em>, breadcrumbs, kicker.
4. Use NATIVE Albanian with PROPER diacritics ë and ç. Words like "Sarandë", "freskët", "peshk", "mëngjes", "çdo", "ditë", "rrugë", "qytet", "deti Jon", "natën", "pranë", "kështu", "këtu", "është" must carry their diacritics. NEVER write "Sarande", "fresket", "mengjes", "cdo", "dite", "eshte".
5. Keep place names: Sarandë, Ksamil, Butrint, Vlorë.
6. Expand the body so total readable text in <p> and <li> is approximately 320-380 words. Add useful sensory and practical detail.
7. Naturally weave in at least ONE of these long-tail phrases somewhere in the body (integrate into a sentence, do not list them): "peshk i freskët pranë meje", "dyqan peshku pranë meje", "treg peshku në Sarandë", "peshk i freskët në Sarandë". Keep it human.
8. Keep the same overall structure, h1, image positions, links, CTA, related-reading, footer.
9. Keep facts: Ardit shop, Rruga Idriz Alidhima 230, +355698967528, 08:30–22:00. DO NOT mention any "Adidas store" or any specific neighbouring business — just the address.
10. Do not invent prices, awards, certifications.

Here is the <main> block:

"""

def call_ai(prompt: str, retries=3):
    for attempt in range(retries):
        r = requests.post(API, headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        }, json={
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
        }, timeout=180)
        if r.status_code == 429:
            time.sleep(8 * (attempt+1)); continue
        if r.status_code >= 500:
            time.sleep(4 * (attempt+1)); continue
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    raise RuntimeError(f"AI failed: {r.status_code} {r.text[:300]}")

def extract_main(html):
    m = re.search(r'(<main\b[^>]*>.*?</main>)', html, re.S)
    if not m: raise ValueError("no <main>")
    return m.group(1), m.start(), m.end()

def clean_response(txt):
    txt = txt.strip()
    # strip code fences if model added them
    txt = re.sub(r'^```(?:html)?\s*', '', txt)
    txt = re.sub(r'\s*```$', '', txt)
    # ensure starts with <main
    i = txt.find('<main')
    j = txt.rfind('</main>')
    if i == -1 or j == -1: raise ValueError("AI returned no <main>")
    return txt[i:j+len('</main>')]

def word_count(html_main):
    # count words inside p and li only
    texts = re.findall(r'<(?:p|li)[^>]*>(.*?)</(?:p|li)>', html_main, re.S)
    total = 0
    for t in texts:
        t = re.sub(r'<[^>]+>', ' ', t)
        total += len(t.split())
    return total

def has_it_diacritics(html_main):
    text = re.sub(r'<[^>]+>', ' ', html_main)
    return bool(re.search(r'[èàùìòéÈÀÙÌÒÉ]', text))

def has_sq_diacritics(html_main):
    text = re.sub(r'<[^>]+>', ' ', html_main)
    return bool(re.search(r'[ëçËÇ]', text))

def count_tags(html, tag):
    return len(re.findall(rf'<{tag}\b', html))

def process(path, lang):
    p = pathlib.Path(path)
    html = p.read_text()
    main_block, s, e = extract_main(html)
    prompt = (PROMPT_IT if lang == "it" else PROMPT_SQ) + main_block
    out = call_ai(prompt)
    new_main = clean_response(out)
    # structural sanity
    for tag in ['h1','img','a']:
        old_c, new_c = count_tags(main_block, tag), count_tags(new_main, tag)
        if new_c < old_c * 0.7:  # allow small drift
            raise ValueError(f"{path}: tag <{tag}> dropped {old_c}->{new_c}")
    wc = word_count(new_main)
    diac_ok = (has_it_diacritics if lang=="it" else has_sq_diacritics)(new_main)
    if not diac_ok:
        raise ValueError(f"{path}: no diacritics in result")
    if wc < 280:
        raise ValueError(f"{path}: only {wc} words")
    new_html = html[:s] + new_main + html[e:]
    p.write_text(new_html)
    return path, wc

def main():
    targets = []
    lang = sys.argv[1]  # it | sq
    files = sys.argv[2:] if len(sys.argv) > 2 else None
    if not files:
        files = sorted(glob.glob(f'public/{lang}/blog/*/index.html'))
    print(f"Processing {len(files)} {lang.upper()} posts", flush=True)
    errors = []
    done = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(process, f, lang): f for f in files}
        for fut in as_completed(futs):
            f = futs[fut]
            try:
                _, wc = fut.result()
                done += 1
                print(f"  [{done}/{len(files)}] OK {f} ({wc} words)", flush=True)
            except Exception as ex_:
                errors.append((f, str(ex_)))
                print(f"  FAIL {f}: {ex_}", flush=True)
    print(f"\nDone. {done}/{len(files)} OK, {len(errors)} failed.")
    if errors:
        for f, e in errors: print(" -", f, e)
        sys.exit(1)

if __name__ == "__main__":
    main()
