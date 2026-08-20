import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    root: '.',
    setupFiles: ['test/setup-e2e.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
