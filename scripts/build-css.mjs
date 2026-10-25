// Copies the stylesheet to dist/ and writes a minified version next to it.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/goldpan.css', 'dist/goldpan.css');
await build({
  entryPoints: ['src/goldpan.css'],
  outfile: 'dist/goldpan.min.css',
  minify: true,
  logLevel: 'warning',
});
console.log('CSS ⚡️ dist/goldpan.css, dist/goldpan.min.css');
