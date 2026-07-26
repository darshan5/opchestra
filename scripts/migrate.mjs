import { execSync } from 'child_process';

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not set, skipping migration');
  process.exit(0);
}

try {
  execSync('node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
  console.log('Database schema pushed successfully');
} catch (e) {
  console.error('prisma db push failed:', e.message);
  console.log('Continuing startup anyway...');
}
