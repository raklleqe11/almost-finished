import { createFileRoute } from "@tanstack/react-router";
// Inline the static homepage HTML at build time so the React router can
// serve it at "/" exactly as the static asset would. Without this, the
// route at "/" intercepts the request and the static public/index.html
// is shadowed.
import indexHtml from "../../public/index.html?raw";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(indexHtml, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate",
          },
        }),
    },
  },
});
