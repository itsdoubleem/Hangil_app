/* A local static server for dist/, with caching switched off.
 *
 *   node tools/serve.mjs [port]      # default 8123
 *
 * Why not `python3 -m http.server`: it sends no Cache-Control, so Chrome applies
 * heuristic freshness and serves ES modules from memory without revalidating.
 * You then edit a file, rebuild, reload, and see the old app — which wastes an
 * hour before you think to doubt the browser rather than the code. In production
 * the service worker owns this problem; locally, no-store is what you want.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const PORT = Number(process.argv[2] || 8123);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.md': 'text/markdown; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(PORT, () => console.log(`HANGIL dist on http://localhost:${PORT} (no-store)`));
