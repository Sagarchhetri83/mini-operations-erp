/**
 * Test setup file — loaded before each test file by Vitest.
 *
 * Loads test environment variables.
 * Tests use the same DATABASE_URL as configured in .env
 * (should be a test database in real CI — for now uses same DB with cleanup).
 */
import 'dotenv/config';

// Ensure critical env vars exist before tests run
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set. Create a .env file in backend/');
}

// Redirect all Prisma calls in tests to the test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!process.env.JWT_SECRET) {
  // Use a test secret if not provided
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production-12345678';
}
