/**
 * proxy-serve.js
 * Menyajikan Angular dist dan mem-proxy /api/* ke Django backend.
 *
 * Konfigurasi via file .env (salin dari .env.example):
 *   API_TARGET  — URL Django backend, default http://127.0.0.1:8001
 *   PORT        — Port server ini berjalan, default 4200
 *
 * Jalankan: node proxy-serve.js
 */

// ── Baca .env jika ada (tanpa library tambahan) ──────────────
;(function loadEnv() {
  try {
    const lines = require('fs').readFileSync('.env', 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch { /* .env tidak wajib ada */ }
})();

const http      = require('http');
const httpProxy = require('./node_modules/http-proxy');
const fs        = require('fs');
const path      = require('path');

const DIST       = path.join(__dirname, 'dist/ptma-frontend/browser');
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8001';
const PORT       = parseInt(process.env.PORT || '4200', 10);

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain',
};

const proxy = httpProxy.createProxyServer({ changeOrigin: true });
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  res.writeHead(502);
  res.end('Bad Gateway');
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    return proxy.web(req, res, { target: API_TARGET });
  }

  // Sajikan file statis Angular
  let filePath = path.join(DIST, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend : http://0.0.0.0:${PORT}`);
  console.log(`API proxy: /api → ${API_TARGET}`);
});
