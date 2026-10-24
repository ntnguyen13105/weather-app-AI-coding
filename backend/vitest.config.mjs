import { defineConfig } from 'vitest/config';

// Test compiled Nest output so TypeScript decorator metadata is preserved.
export default defineConfig({ test: { include: ['test/**/*.test.mjs'] } });
