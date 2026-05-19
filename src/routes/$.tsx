import { createFileRoute } from "@tanstack/react-router";

// Bundle every static HTML page under /public as a string. The TanStack
// Start asset pipeline does NOT reliably serve trailing-slash URLs like
// /daily-catch-saranda/ or /it/ — Vite 307-redirects them to the
// extension-less form which the router then 404s on. This catch-all
// resolves any request path to the right public/**/*.html file.
const htmlModules = import.meta.glob("../../public/**/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Build a path map: normalized URL path -> HTML content.
// e.g. ../../public/daily-catch-saranda.html      -> "/daily-catch-saranda"
//      ../../public/daily-catch-saranda/index.html-> "/daily-catch-saranda"
//      ../../public/it/blog/foo/index.html        -> "/it/blog/foo"
const PAGE_MAP: Record<string, string> = {};
for (const [modPath, html] of Object.entries(htmlModules)) {
  let p = modPath.replace(/^.*\/public/, "");
  if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length);
  else if (p.endsWith(".html")) p = p.slice(0, -".html".length);
  if (p === "") p = "/";
  PAGE_MAP[p] = html;
}

function lookup(rawPath: string): string | null {
  // Decode and strip query/hash if present, normalize trailing slash.
  let p = rawPath.split("?")[0].split("#")[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep as-is */
  }
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (PAGE_MAP[p]) return PAGE_MAP[p];
  // Also try the bare ".html" form just in case
  if (PAGE_MAP[p.replace(/\.html$/, "")]) return PAGE_MAP[p.replace(/\.html$/, "")];
  return null;
}

// Canonical form: trailing slash for all HTML pages (matches the URLs the
// static HTML uses internally, e.g. /daily-catch-saranda/, /it/blog/foo/).
// Requests without a trailing slash get a 301 to the canonical form.
// Exceptions: "/" itself and any path that looks like a file.
function shouldRedirectToSlash(pathname: string): boolean {
  if (pathname === "/" || pathname.endsWith("/")) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (last.includes(".")) return false; // /foo.html, /sitemap.xml, /logo.png
  return true;
}

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);

        if (shouldRedirectToSlash(url.pathname)) {
          const target = url.pathname + "/" + url.search + url.hash;
          return new Response(null, { status: 301, headers: { Location: target } });
        }

        const html = lookup(url.pathname);
        if (html) {
          return new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=0, must-revalidate",
            },
          });
        }
        return new Response("Not Found", { status: 404 });
      },
    },
  },
});
