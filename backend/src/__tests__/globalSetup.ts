import { execSync } from 'child_process';
import 'dotenv/config';

export default function setup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set in .env. Test database isolation required.');
  }

  // Force the Prisma CLI to use the test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  console.log('🔄 Synchronizing test database schema...');
  // Push the schema to the test database safely
  execSync('npx prisma db push --accept-data-loss', { 
    env: process.env, 
    stdio: 'inherit' 
  });

  console.log('🌱 Seeding test database...');
  execSync('npx tsx prisma/seed.ts', { 
    env: process.env, 
    stdio: 'inherit' 
  });

  console.log('✅ Test database ready.');
}
