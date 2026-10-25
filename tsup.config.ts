import { defineConfig } from 'tsup';
import { readdirSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; repository?: { url?: string } };
const repo = (pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
const define = { __VERSION__: JSON.stringify(pkg.version) };
const banner = { js: `/*! Goldpan v${pkg.version} | MIT License | ${repo} */` };

const locales = readdirSync('src/locales')
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.global.ts') && f !== 'register-global.ts')
  .map((f) => f.replace(/\.ts$/, ''));

export default defineConfig([
  // Core library: ESM + CommonJS + type declarations
  {
    entry: { goldpan: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    define,
    target: 'es2020',
    banner,
  },
  // Locales: each one is a single default export; `cjsInterop` makes require('goldpan/locales/it') return it directly
  {
    entry: Object.fromEntries(locales.map((l) => [`locales/${l}`, `src/locales/${l}.ts`])),
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    splitting: true,
    cjsInterop: true,
    define,
    target: 'es2020',
    banner,
  },
  // Browser <script> builds (window.Goldpan), plain and minified
  ...[false, true].map((minify) => ({
    entry: {
      [`goldpan.global${minify ? '.min' : ''}`]: 'src/global.ts',
      ...Object.fromEntries(locales.map((l) => [`locales/${l}.global${minify ? '.min' : ''}`, `src/locales/${l}.global.ts`])),
    },
    format: ['iife'] as const,
    define,
    minify,
    sourcemap: minify,
    target: 'es2020',
    outExtension: () => ({ js: '.js' }),
    banner,
  })),
]);
