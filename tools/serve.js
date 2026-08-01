/**
 * OğuzWeb — yerel statik sunucu
 * ----------------------------------------------------------------------------
 * Sıfır bağımlılık. Yalnızca geliştirme içindir.
 *
 * Neden gerekli: file:// protokolünde @font-face yüklenmez ve ES modülleri
 * CORS nedeniyle çalışmaz. Tokenları ve fontları doğrulamak için http şart.
 *
 * Kullanım:  node tools/serve.js [port]
 */

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.argv[2]) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let rel = decodeURIComponent(url.pathname);

    if (rel.endsWith("/")) rel += "index.html";
    if (!path.extname(rel)) rel += ".html";

    const file = path.join(DIST, rel);

    /* Dizin dışına çıkışı engelle */
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end("403");
      return;
    }

    const body = await fs.readFile(file);
    const type = TYPES[path.extname(file)] || "application/octet-stream";

    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    try {
      const notFound = await fs.readFile(path.join(DIST, "404.html"));
      res.writeHead(404, { "content-type": TYPES[".html"] }).end(notFound);
    } catch {
      res.writeHead(404, { "content-type": TYPES[".html"] }).end("404");
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  OğuzWeb → \x1b[1mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`  Token doğrulama → http://localhost:${PORT}/_dev-tokens\n`);
});
