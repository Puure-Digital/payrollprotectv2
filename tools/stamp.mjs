// Versions every stylesheet and script the pages load, by content, so a new page can never meet a
// stale copy from a browser or CDN cache (an old base.css under a new page once showed the
// preloader's raw markup). Styles and classic scripts get ?v=<hash> on their links; module pages
// get an import map, so every module, and everything each module imports, is versioned too.
// Run it after changing any CSS or JS; tools/check.mjs fails while a page is out of date.
// usage: node tools/stamp.mjs [--check]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
// Line endings are ignored, so a Windows checkout (CRLF) and the server's (LF) agree on a version.
const hash = (path) => createHash('sha1').update(readFileSync(join(site, path), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
const check = process.argv.includes('--check');
const modules = readdirSync(join(site, 'js')).filter((f) => f.endsWith('.js')).sort();
const ASSET = /((?:href|src)=")(\/?)((?:css|js|assets\/vendor)\/[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"/g;
const MAP = /<script type="importmap">[\s\S]*?<\/script>/;

const stale = [];
for (const page of readdirSync(site).filter((f) => f.endsWith('.html'))) {
  const file = join(site, page);
  const before = readFileSync(file, 'utf8');
  let html = before.replace(ASSET, (m, attr, slash, path) => `${attr}${slash}${path}?v=${hash(path)}"`);
  if (/<script type="module"/.test(html)) {
    // 404.html links from the site root (it is served at any depth); the rest link relatively.
    const root = /(?:href|src)="\/css\//.test(html) ? '/' : './';
    const imports = Object.fromEntries(modules.map((m) => [`${root}js/${m}`, `${root}js/${m}?v=${hash('js/' + m)}`]));
    const tag = `<script type="importmap">\n  ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;
    // It must come before any module script: in the head, ahead of the stylesheets.
    html = MAP.test(html) ? html.replace(MAP, tag) : html.replace(/\n(\s*)<link rel="stylesheet"/, `\n$1${tag}\n$1<link rel="stylesheet"`);
  }
  if (html !== before) {
    stale.push(page);
    if (!check) writeFileSync(file, html);
  }
}
if (check) {
  if (stale.length) { console.log('out of date: ' + stale.join(', ') + ' (run node tools/stamp.mjs)'); process.exit(1); }
  console.log('all pages current');
} else console.log(stale.length ? 'stamped: ' + stale.join(', ') : 'all pages current');
