import { spawn } from 'child_process';
import { existsSync, watch } from 'fs';
import { createServer } from 'http';
import { createReadStream, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = parseInt(process.env.PORT || '5000', 10);
const DIST_DIR = resolve(__dirname, 'dist/public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  let filePath = join(DIST_DIR, urlPath);

  // Try exact file first
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback — serve index.html
  const indexPath = join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Build in progress, please wait...');
  }
}

// Start Angular build in watch mode
console.log('Starting Angular build in watch mode...');
const ngBuild = spawn(
  'node',
  ['node_modules/@angular/cli/bin/ng.js', 'build', '--configuration=development', '--watch'],
  {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false', FORCE_COLOR: '1' },
    cwd: __dirname,
  }
);

ngBuild.on('error', (err) => {
  console.error('Failed to start ng build:', err.message);
});

// Poll until first build completes, then start HTTP server
console.log(`Waiting for initial build to finish...`);
const poll = setInterval(() => {
  if (existsSync(join(DIST_DIR, 'index.html'))) {
    clearInterval(poll);
    const server = createServer(serveStatic);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
      console.log(`  ➜  Serving: ${DIST_DIR}\n`);
    });
  }
}, 1000);

process.on('SIGTERM', () => { ngBuild.kill('SIGTERM'); process.exit(0); });
process.on('SIGINT',  () => { ngBuild.kill('SIGTERM'); process.exit(0); });
