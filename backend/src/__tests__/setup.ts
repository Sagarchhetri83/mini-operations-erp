/**
 * Test setup file — loaded before each test file by Vitest.
 *
 * Loads test environment variables.
 * Tests use the same DATABASE_URL as configured in .env
 * (should be a test database in real CI — for now uses same DB with cleanup).
 */
import 'dotenv/config';

// Ensure critical env vars exist before tests run
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Create a .env file in backend/');
}

if (!process.env.JWT_SECRET) {
  // Use a test secret if not provided
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production-12345678';
}
