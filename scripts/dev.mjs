// Local demo: builds the library and the demo site, serves site/ on http://localhost:5173,
// opens the browser and reloads the page after every change in src/ or demo/.
//   npm run dev                  start (if 5173 is busy, the next free port is used)
//   npm run dev -- --no-open     same, without opening the browser
//   PORT=8080 npm run dev        fixed port (PowerShell: $env:PORT=8080; npm run dev)
import { exec, execSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const ROOT = resolve('site');
const FIXED_PORT = Number(process.env.PORT) || 0;
const FIRST_PORT = FIXED_PORT || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
// Added to every page served: the browser reloads when a build finishes.
const RELOAD = '<script>new EventSource("/__reload").onmessage = () => location.reload();</script>';
const NOT_BUILT =
  '<!doctype html><meta charset="utf-8"><title>Goldpan demo</title>' +
  '<p style="font:16px/1.5 system-ui,sans-serif;margin:2rem">The demo has not been built yet: see the terminal. ' +
  'This page reloads by itself as soon as the build succeeds.</p>' +
  RELOAD;

// ---------------------------------------------------------------------------
// Build: a change in src/ rebuilds the library and the page (a few seconds),
// a change in demo/ rebuilds only the page (instant). The build output is
// shown only when something goes wrong.
// ---------------------------------------------------------------------------
function run(command, done) {
  const started = Date.now();
  try {
    execSync(command, { stdio: 'pipe' });
    const ms = Date.now() - started;
    console.log(`  ✓ ${done} in ${ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`}`);
    return true;
  } catch (error) {
    // The tools write their errors to stderr; the rest of their output is the usual list of files.
    process.stderr.write(String([error.stderr, error.stdout].find((output) => output?.length) ?? error.message));
    console.error('\n  ✗ Build failed: fix the error above, the demo is rebuilt on the next change.\n');
    return false;
  }
}
const buildAll = () => run('npm run build:site --silent', 'Library and demo built');
const buildPage = () => run('node scripts/build-site.mjs', 'Demo page rebuilt');

console.log('\n  Building Goldpan and the demo…');
let libraryReady = buildAll();
let libraryChanged = false;
let timer;

function schedule(library) {
  libraryChanged ||= library;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const full = libraryChanged || !libraryReady;
    libraryChanged = false;
    const ok = full ? buildAll() : buildPage();
    if (full) libraryReady = ok;
    if (ok) reloadBrowsers();
  }, 150);
}
watch('src', { recursive: true }, () => schedule(true));
watch('demo', { recursive: true }, () => schedule(false));

// ---------------------------------------------------------------------------
// Server: only the files inside site/, plus the reload channel.
// ---------------------------------------------------------------------------
const browsers = new Set();

function reloadBrowsers() {
  for (const res of browsers) res.write('data: reload\n\n');
}

function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, { Allow: 'GET, HEAD' }).end();

  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    return res.writeHead(400).end('Bad request');
  }

  if (path === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
    res.write(': connected\n\n');
    browsers.add(res);
    req.on('close', () => browsers.delete(res));
    return;
  }

  let file = resolve(ROOT, `.${path}`);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return res.writeHead(403).end('Forbidden');
  if (!existsSync(ROOT)) return res.writeHead(503, { 'Content-Type': TYPES['.html'] }).end(NOT_BUILT);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end('Not found');

  const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (extname(file) === '.html') {
    const page = readFileSync(file, 'utf8');
    const end = page.lastIndexOf('</body>');
    return res.writeHead(200, headers).end(end < 0 ? page + RELOAD : `${page.slice(0, end)}${RELOAD}\n${page.slice(end)}`);
  }
  res.writeHead(200, headers);
  createReadStream(file)
    .on('error', () => res.destroy())
    .pipe(res);
}

const server = createServer((req, res) => {
  try {
    handle(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

let port = FIRST_PORT;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && !FIXED_PORT && port < FIRST_PORT + 20) {
    server.listen(++port, 'localhost');
    return;
  }
  console.error(
    error.code === 'EADDRINUSE'
      ? `\n  Port ${port} is already in use: stop the other server or choose another port with PORT.\n`
      : error,
  );
  process.exit(1);
});
server.on('listening', () => {
  const address = `http://localhost:${port}`;
  console.log(`\n  Goldpan demo → ${address}\n  Edits in src/ and demo/ are rebuilt and the page reloads. Ctrl+C to stop.\n`);
  if (!process.argv.includes('--no-open')) openBrowser(address);
});
server.listen(port, 'localhost');

function openBrowser(url) {
  const command =
    process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(command, () => {}); // best effort: without a browser the address above is enough
}
