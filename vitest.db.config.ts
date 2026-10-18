// Database tests: need Postgres running and seeded (see `npm run test:db`).
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.db.test.ts'], environment: 'node', fileParallelism: false },
});
