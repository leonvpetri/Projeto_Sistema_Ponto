import { existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { config } from 'dotenv';

config({ path: '.env.test', override: true });

// Caminho relativo do SQLite é resolvido pelo Prisma em relação a prisma/schema.prisma, não ao cwd.
const dbPath = './prisma/test.db';
if (existsSync(dbPath)) unlinkSync(dbPath);

execSync('npx prisma db push --skip-generate', {
  stdio: 'inherit',
  env: process.env,
});
