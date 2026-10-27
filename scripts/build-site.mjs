// Builds the demo site into site/ (published by GitHub Pages): the page in English, the same page
// already translated into Italian (site/it/, so search engines can index it), a sitemap, and a
// single-file copy, site/standalone.html, that works without a server.
// Links come from package.json: repository, homepage and funding.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const repoUrl = (pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
const sponsorUrl = [pkg.funding].flat().map((f) => (typeof f === 'string' ? f : f?.url)).find(Boolean) ?? '';
const homepage = pkg.homepage ? pkg.homepage.replace(/\/?$/, '/') : '';
const owner = repoUrl.match(/github\.com\/([^/]+)/)?.[1];

const FONTS = [
  ['familjen-grotesk', ['latin-500-normal', 'latin-700-normal']],
  ['instrument-sans', ['latin-400-normal', 'latin-500-normal', 'latin-600-normal']],
  ['jetbrains-mono', ['latin-400-normal', 'latin-500-normal']],
];

// The Italian texts live in the page script, in `const IT = { ... };`.
function italianTexts(source) {
  const start = source.indexOf('const IT = {');
  const end = source.indexOf('\n  };', start);
  if (start < 0 || end < 0) throw new Error('The Italian texts (const IT = { ... }) were not found in demo/index.html');
  return runInNewContext(`(${source.slice(source.indexOf('{', start), end + 4)})`);
}

// What the page is, for search engines (schema.org).
function structuredData(description, url, language) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'Goldpan',
    description,
    url,
    inLanguage: language,
    codeRepository: repoUrl || undefined,
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Web browser',
    license: 'https://opensource.org/licenses/MIT',
    version: pkg.version,
    keywords: pkg.keywords?.join(', '),
    author: { '@type': 'Person', name: pkg.author?.name ?? pkg.author, url: owner ? `https://github.com/${owner}` : undefined },
  };
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

// The same page, already in Italian. It lives one folder down, so its own files are one level up.
function italianPage(source, it) {
  const dom = new JSDOM(source);
  const doc = dom.window.document;
  doc.documentElement.lang = 'it';
  doc.documentElement.dataset.pageLang = 'it';
  const english = {};
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    const key = el.dataset.i18n;
    english[key] = el.innerHTML;
    if (it[key] !== undefined) el.innerHTML = it[key];
  }
  const setContent = (selector, value) => doc.querySelector(selector)?.setAttribute('content', value);
  setContent('meta[name="description"]', it.metaDesc);
  setContent('meta[property="og:title"]', it.ogTitle);
  setContent('meta[property="og:description"]', it.ogDesc);
  setContent('meta[property="og:image:alt"]', it.ogAlt);
  setContent('meta[property="og:locale"]', 'it_IT');
  if (homepage) {
    setContent('meta[property="og:url"]', `${homepage}it/`);
    doc.querySelector('link[rel="canonical"]')?.setAttribute('href', `${homepage}it/`);
    const ld = doc.querySelector('script[type="application/ld+json"]');
    if (ld) ld.textContent = `\n${structuredData(it.metaDesc, `${homepage}it/`, 'it')}\n`;
  }
  const local = (url) => url && !/^([a-z][a-z0-9+.-]*:|\/|#|\{\{)/i.test(url);
  for (const el of doc.querySelectorAll('link[href], script[src], img[src]')) {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    if (local(el.getAttribute(attr))) el.setAttribute(attr, `../${el.getAttribute(attr)}`);
  }
  for (const style of doc.querySelectorAll('style')) style.textContent = style.textContent.replaceAll('url(fonts/', 'url(../fonts/');
  // The English texts travel with the page, for the language switch.
  const saved = doc.createElement('script');
  saved.type = 'application/json';
  saved.id = 'i18n-en';
  saved.textContent = JSON.stringify(english).replace(/</g, '\\u003c');
  doc.head.append(saved);
  return dom.serialize();
}

rmSync('site', { recursive: true, force: true });
mkdirSync('site/locales', { recursive: true });
mkdirSync('site/fonts', { recursive: true });
mkdirSync('site/it', { recursive: true });

let html = readFileSync('demo/index.html', 'utf8');
const IT = italianTexts(html);
if (!sponsorUrl) html = html.replace(/<!-- sponsor:start -->[\s\S]*?<!-- sponsor:end -->/, '');
// A value that is missing leaves its {{TOKEN}}: the page hides links that still contain one.
for (const [token, value] of [['REPO_URL', repoUrl], ['SPONSOR_URL', sponsorUrl]]) {
  if (value) html = html.replaceAll(`{{${token}}}`, value);
}
// Canonical address, language versions, social preview and structured data need an absolute URL:
// without a homepage they are left out.
if (homepage) {
  const languages = [['en', homepage], ['it', `${homepage}it/`], ['x-default', homepage]];
  html = html
    .replaceAll('{{HOMEPAGE}}', homepage)
    .replace(/(<link rel="canonical"[^>]*>)/, `$1\n${languages.map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`).join('\n')}`)
    .replace('</head>', `<script type="application/ld+json">\n${structuredData(pkg.description, homepage, 'en')}\n</script>\n</head>`);
} else {
  html = html.replace(/^.*(\{\{HOMEPAGE\}\}|"og:image:|"twitter:card").*\n/gm, '');
}
writeFileSync('site/index.html', html);
writeFileSync('site/it/index.html', italianPage(html, IT));

if (homepage) {
  const day = new Date().toISOString().slice(0, 10);
  const alternates = [['en', homepage], ['it', `${homepage}it/`], ['x-default', homepage]]
    .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
    .join('\n');
  const urls = [homepage, `${homepage}it/`]
    .map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${day}</lastmod>\n${alternates}\n  </url>`)
    .join('\n');
  writeFileSync(
    'site/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
  );
}

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
  .replace(/<link rel="preload"[^>]*>\n?/g, '')
  .replace('href="icon.svg"', () => `href="${dataUri('demo/icon.svg', 'image/svg+xml')}"`)
  .replace(/url\(fonts\/([\w-]+\.woff2)\)/g, (_, file) => `url(${dataUri(`site/fonts/${file}`, 'font/woff2')})`)
  .replace('<link rel="stylesheet" href="goldpan.css">', () => `<style>\n${read('goldpan.css')}\n</style>`)
  .replace('<script src="goldpan.global.js" defer></script>', () => `<script>\n${read('goldpan.global.min.js')}\n</script>`)
  .replace('<script src="locales/all.global.js" defer></script>', () => `<script>\n${read('locales/all.global.min.js')}\n</script>`);
writeFileSync('site/standalone.html', standalone);
console.log('Site ⚡️ site/index.html, site/it/index.html, site/standalone.html (single file, opens with a double click)');
