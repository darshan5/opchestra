import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const prismaPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

if (!existsSync(prismaPath)) {
  console.log('Prisma CLI not found, skipping migration');
  process.exit(0);
}

try {
  execSync(`node ${prismaPath} db push --skip-generate --accept-data-loss`, {
    stdio: 'inherit',
    env: {
      ...process.env,
    },
  });
  console.log('Database schema pushed successfully');
} catch {
  console.log('Warning: prisma db push failed, continuing anyway');
}
