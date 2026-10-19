// Migrate forward and seed the e2e database (never reset — safe to re-run).
import { execSync } from 'node:child_process';
import { E2E_ENV } from '../../playwright.config';

export default function globalSetup() {
  const env = { ...process.env, ...E2E_ENV };
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx prisma db seed', { stdio: 'inherit', env });
}
