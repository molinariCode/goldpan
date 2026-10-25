import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __VERSION__: JSON.stringify('test') },
  // Pure logic runs in Node; files that need a page start with `// @vitest-environment jsdom`.
  test: { environment: 'node', globals: true, include: ['test/**/*.test.ts'] },
});
