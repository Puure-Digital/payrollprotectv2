// Tiny static file server for local preview (no dependencies).
// Usage: node tools/serve.js [port] [dir]
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2], 10) || 8000;
const root = path.resolve(process.argv[3] || path.join(__dirname, '..', 'site'));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml'
};

http.createServer((req, res) => {
  // This machine only. It still listens on every address, because localhost resolves to IPv6
  // first here, but anything from the network is refused.
  if (!['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) { res.writeHead(403); return res.end(); }
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end(); } // a broken %-code must not crash the server
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
  const send = (file, size, status) => {
    res.writeHead(status, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  };
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) return send(filePath, stat.size, 200);
    // As a static host does: a missing page gets the site's 404.html, still with status 404.
    const page = path.join(root, '404.html');
    fs.stat(page, (e, s) => {
      if (!e && s.isFile()) return send(page, s.size, 404);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });
  });
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
