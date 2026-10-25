// Builds the demo site into site/ (published by GitHub Pages) and a single-file
// copy, site/standalone.html, that works without a server.
// Links come from package.json: repository, homepage and funding.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const repoUrl = (pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
const sponsorUrl = [pkg.funding].flat().map((f) => (typeof f === 'string' ? f : f?.url)).find(Boolean) ?? '';
const homepage = pkg.homepage ? pkg.homepage.replace(/\/?$/, '/') : '';

const FONTS = [
  ['familjen-grotesk', ['latin-500-normal', 'latin-700-normal']],
  ['instrument-sans', ['latin-400-normal', 'latin-500-normal', 'latin-600-normal']],
  ['jetbrains-mono', ['latin-400-normal', 'latin-500-normal']],
];

rmSync('site', { recursive: true, force: true });
mkdirSync('site/locales', { recursive: true });
mkdirSync('site/fonts', { recursive: true });

let html = readFileSync('demo/index.html', 'utf8');
if (!sponsorUrl) html = html.replace(/<!-- sponsor:start -->[\s\S]*?<!-- sponsor:end -->/, '');
// A value that is missing leaves its {{TOKEN}}: the page hides links that still contain one.
for (const [token, value] of [['REPO_URL', repoUrl], ['SPONSOR_URL', sponsorUrl]]) {
  if (value) html = html.replaceAll(`{{${token}}}`, value);
}
// Canonical address and social preview need an absolute URL: without a homepage they are left out.
html = homepage
  ? html.replaceAll('{{HOMEPAGE}}', homepage)
  : html.replace(/^.*(\{\{HOMEPAGE\}\}|"og:image:|"twitter:card").*\n/gm, '');
writeFileSync('site/index.html', html);

for (const f of ['goldpan.css', 'goldpan.global.js', 'goldpan.global.min.js']) cpSync(`dist/${f}`, `site/${f}`);
cpSync('dist/locales/all.global.js', 'site/locales/all.global.js');
for (const f of ['icon.svg', 'og.png']) if (existsSync(`demo/${f}`)) cpSync(`demo/${f}`, `site/${f}`);

const licences = [];
for (const [family, styles] of FONTS) {
  const dir = `node_modules/@fontsource/${family}`;
  for (const style of styles) cpSync(`${dir}/files/${family}-${style}.woff2`, `site/fonts/${family}-${style}.woff2`);
  licences.push(`=== ${family} ===\n\n${readFileSync(`${dir}/LICENSE`, 'utf8')}`);
}
writeFileSync('site/fonts/OFL.txt', licences.join('\n\n'));

// standalone.html: one file with everything inside (library, styles, fonts, icon), to open with a double click.
const read = (f) => readFileSync(`dist/${f}`, 'utf8');
const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;
const standalone = html
  .replace(/<link rel="preload"[^>]*>\n?/, '')
  .replace('href="icon.svg"', () => `href="${dataUri('demo/icon.svg', 'image/svg+xml')}"`)
  .replace(/url\(fonts\/([\w-]+\.woff2)\)/g, (_, file) => `url(${dataUri(`site/fonts/${file}`, 'font/woff2')})`)
  .replace('<link rel="stylesheet" href="goldpan.css">', () => `<style>\n${read('goldpan.css')}\n</style>`)
  .replace('<script src="goldpan.global.js"></script>', () => `<script>\n${read('goldpan.global.min.js')}\n</script>`)
  .replace('<script src="locales/all.global.js"></script>', () => `<script>\n${read('locales/all.global.min.js')}\n</script>`);
writeFileSync('site/standalone.html', standalone);
console.log('Site ⚡️ site/index.html, site/standalone.html (single file, opens with a double click)');
