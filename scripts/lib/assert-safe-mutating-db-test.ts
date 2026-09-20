export function assertSafeMutatingDbTestEnvironment() {
  const allow = process.env.ALLOW_MUTATING_DB_TESTS;
  const env = process.env.MUTATING_DB_TEST_ENV;
  const dbUrl = process.env.DATABASE_URL || '';

  // 1. Production Hard Deny overrides everything
  // Known Production project ID: ep-flat-waterfall-b3uvjas7
  if (dbUrl.includes('ep-flat-waterfall-b3uvjas7')) {
    console.error('[BLOCKED] Refusing to run tests against production database (ep-flat-waterfall-b3uvjas7)');
    process.exit(1);
  }

  // 2. Requires ALLOW flag
  if (allow !== 'true') {
    console.error('[BLOCKED] Tests require ALLOW_MUTATING_DB_TESTS=true');
    process.exit(1);
  }

  // 3. Requires safe marker
  if (env !== 'development' && env !== 'qa') {
    console.error('[BLOCKED] Tests require MUTATING_DB_TEST_ENV=development or qa');
    process.exit(1);
  }
}
