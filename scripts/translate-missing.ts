#!/usr/bin/env bun
/**
 * Translate the EN top-level static pages into Italian and Albanian.
 * Uses Lovable AI Gateway (google/gemini-2.5-flash) and writes
 * public/{it,sq}/{slug}/index.html for each missing translation.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const API_KEY = process.env.LOVABLE_API_KEY;
if (!API_KEY) throw new Error("LOVABLE_API_KEY not set");

const ROOT = "/dev-server/public";
const SLUGS = [
  "best-fish-market-saranda",
  "butrint-seafood-guide",
  "fish-market-vs-supermarket-saranda",
  "fresh-fish-saranda-tourists",
  "octopus-saranda-fresh",
  "sardines-albania-saranda",
  "sea-bream-saranda-price-season",
];
const LANGS = [
  { code: "it", name: "Italian", locale: "it_IT" },
  { code: "sq", name: "Albanian (shqip)", locale: "sq_AL" },
] as const;

function prompt(html: string, slug: string, lang: typeof LANGS[number]) {
  return `You are translating an HTML page for the Fish Shop Ardit website (freshfish.al) from English into ${lang.name}.

STRICT RULES — output the FULL translated HTML, nothing else (no markdown fences, no commentary):

1. Translate ALL visible/user-facing text: <title>, meta description, og/twitter title+description, headings, paragraphs, list items, button labels, alt attributes, table cells, FAQ entries, tag labels, breadcrumbs, footer text.
2. Keep ALL HTML structure, classes, ids, inline CSS, <script> JSON-LD, attribute names, and image src paths IDENTICAL. Do not reorder or remove tags.
3. Inside <script type="application/ld+json"> blocks: translate ONLY the values of "headline", "description", "name" (when it's a breadcrumb/page name, NOT business/org names like "Fish Shop Ardit"), and breadcrumb item names. Keep URLs, dates, types, addresses, and "Fish Shop Ardit" untouched.
4. Change <html lang="en"> to <html lang="${lang.code}">.
5. Change og:locale content to "${lang.locale}".
6. URL rewrites:
   - canonical and og:url: prepend /${lang.code} to the path (e.g. https://freshfish.al/${slug} → https://freshfish.al/${lang.code}/${slug}/, always end with trailing slash).
   - hreflang alternates: keep the EN one as https://freshfish.al/${slug}/, add/keep sq as https://freshfish.al/sq/${slug}/, it as https://freshfish.al/it/${slug}/, x-default = EN.
   - Internal nav/footer/CTA links to other site pages (e.g. href="/daily-catch-saranda/", href="/blog/", href="/visit-fish-shop-ardit/"): prepend /${lang.code} so they become href="/${lang.code}/daily-catch-saranda/" etc. Keep href="/" pointing to "/${lang.code}/" for home. Leave tel:, mailto:, /images/*, /favicon.ico, /sitemap.xml, https://, and #anchors UNCHANGED.
   - In the language switcher bar, the active link must point to the ${lang.code} URL of THIS page and have class="active"; the other two languages link to their respective versions of this page.
7. Preserve Albanian/Italian diacritics correctly (Sarandë for sq, Saranda for it/en is fine).
8. Do not add new content, do not remove sections, do not change the visual design.

The page slug is "${slug}". Here is the source HTML:

\`\`\`html
${html}
\`\`\``;
}

async function translate(html: string, slug: string, lang: typeof LANGS[number]): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt(html, slug, lang) }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let out: string = data.choices?.[0]?.message?.content ?? "";
  // Strip optional ```html fences
  out = out.trim();
  const fence = out.match(/^```(?:html)?\n([\s\S]*?)\n```$/);
  if (fence) out = fence[1];
  if (!out.startsWith("<!DOCTYPE") && !out.startsWith("<!doctype")) {
    throw new Error(`Model output didn't start with <!DOCTYPE for ${slug}/${lang.code}:\n${out.slice(0, 200)}`);
  }
  return out;
}

const force = process.argv.includes("--force");

for (const slug of SLUGS) {
  const src = join(ROOT, `${slug}.html`);
  if (!existsSync(src)) {
    console.warn(`skip (missing source): ${src}`);
    continue;
  }
  const html = readFileSync(src, "utf8");
  for (const lang of LANGS) {
    const outDir = join(ROOT, lang.code, slug);
    const out = join(outDir, "index.html");
    if (existsSync(out) && !force) {
      console.log(`exists, skip: ${out}`);
      continue;
    }
    console.log(`translating ${slug} → ${lang.code} ...`);
    const t0 = Date.now();
    try {
      const translated = await translate(html, slug, lang);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(out, translated);
      console.log(`  wrote ${out} (${translated.length} bytes, ${Date.now() - t0}ms)`);
    } catch (e) {
      console.error(`  FAILED ${slug}/${lang.code}:`, e);
    }
  }
}
console.log("done.");
