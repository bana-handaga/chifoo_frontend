/**
 * proxy-serve.js
 * Serves the Angular dist and proxies /api/* to the Django backend on port 8001.
 */
const http = require('http');
const httpProxy = require('./node_modules/http-proxy');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist/ptma-frontend/browser');
const API_TARGET = 'http://127.0.0.1:8001';
const PORT = 4200;

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

  // Serve static files
  let filePath = path.join(DIST, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving at http://0.0.0.0:${PORT}`);
  console.log(`API proxy: /api -> ${API_TARGET}`);
});
