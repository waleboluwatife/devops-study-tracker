// Database tests against a separate `tracker_test` database: migrate it forward,
// seed it (a no-op when already seeded), then run the *.db.test.ts files.
// Nothing is ever reset or dropped. Override with TEST_DATABASE_URL.
import { execSync } from 'node:child_process';

const url = process.env.TEST_DATABASE_URL
  ?? 'postgresql://tracker:tracker@localhost:5433/tracker_test';
const env = { ...process.env, DATABASE_URL: url };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('npx prisma migrate deploy');
run('npx prisma db seed');
run('npx vitest run -c vitest.db.config.ts');
