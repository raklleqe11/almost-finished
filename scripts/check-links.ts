#!/usr/bin/env bun
/**
 * Crawl every internal link on the site and fail if anything 404s or
 * redirects unexpectedly. Run against a running dev/preview server:
 *
 *   bun run scripts/check-links.ts                 # http://localhost:8080
 *   BASE_URL=https://freshfish.al bun run scripts/check-links.ts
 *
 * Exit code 0 = clean, 1 = problems found.
 *
 * Rules:
 *  - Any response that is not 200 (after following the chain manually) fails.
 *  - A 3xx is OK only if the Location is the same path with a trailing
 *    slash added (our canonical-slash redirect). Anything else fails.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 500);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);

type Problem = { url: string; from: string; reason: string };

const visited = new Set<string>();
const queue: Array<{ url: string; from: string }> = [{ url: "/", from: "(seed)" }];
const problems: Problem[] = [];
let pagesChecked = 0;

function isInternalHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) return false;
  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      const b = new URL(BASE);
      return u.host === b.host;
    } catch {
      return false;
    }
  }
  return true;
}

function normalize(href: string, from: string): string | null {
  try {
    const abs = new URL(href, BASE + from);
    abs.hash = "";
    return abs.pathname + abs.search;
  } catch {
    return null;
  }
}

function isCanonicalSlashRedirect(fromPath: string, location: string): boolean {
  try {
    const loc = new URL(location, BASE + fromPath);
    if (loc.host !== new URL(BASE).host) return false;
    const want = fromPath.split("?")[0].split("#")[0] + "/";
    return loc.pathname === want;
  } catch {
    return false;
  }
}

const HREF_RE = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;

function extractLinks(html: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = HREF_RE.exec(html)) !== null) out.push(m[1]);
  return out;
}

async function checkOne(path: string, from: string): Promise<void> {
  pagesChecked++;
  const target = BASE + path;
  let res: Response;
  try {
    res = await fetch(target, { redirect: "manual" });
  } catch (e) {
    problems.push({ url: path, from, reason: `fetch failed: ${(e as Error).message}` });
    return;
  }

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location") ?? "";
    if (!isCanonicalSlashRedirect(path, loc)) {
      problems.push({
        url: path,
        from,
        reason: `unexpected ${res.status} redirect to ${loc || "(no Location)"}`,
      });
      return;
    }
    // Re-fetch the canonical target so we still extract links.
    try {
      res = await fetch(new URL(loc, BASE + path).toString(), { redirect: "manual" });
    } catch (e) {
      problems.push({ url: path, from, reason: `redirect target fetch failed: ${(e as Error).message}` });
      return;
    }
  }

  if (res.status !== 200) {
    problems.push({ url: path, from, reason: `HTTP ${res.status}` });
    return;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return; // assets — no links to extract

  const html = await res.text();
  for (const raw of extractLinks(html)) {
    if (!isInternalHref(raw)) continue;
    const norm = normalize(raw, path);
    if (!norm) continue;
    if (visited.has(norm)) continue;
    visited.add(norm);
    if (visited.size >= MAX_PAGES) continue;
    queue.push({ url: norm, from: path });
  }
}

console.log(`Crawling ${BASE} (max ${MAX_PAGES} URLs, concurrency ${CONCURRENCY})`);
visited.add("/");

while (queue.length > 0) {
  const batch = queue.splice(0, CONCURRENCY);
  await Promise.all(batch.map((b) => checkOne(b.url, b.from)));
  if (pagesChecked % 25 === 0 || queue.length === 0) {
    process.stdout.write(`  checked ${pagesChecked} | queued ${queue.length} | problems ${problems.length}\n`);
  }
}

console.log(`\nDone. Visited ${visited.size} URLs, checked ${pagesChecked}.`);

if (problems.length === 0) {
  console.log("✅ No broken links or unexpected redirects.");
  process.exit(0);
}

console.error(`\n❌ ${problems.length} problem(s) found:\n`);
for (const p of problems) {
  console.error(`  ${p.url}`);
  console.error(`     from: ${p.from}`);
  console.error(`     ${p.reason}\n`);
}
process.exit(1);
