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
  // 4. Require EXPECTED_DB_BRANCH positive identity match
  const expectedBranch = process.env.EXPECTED_DB_BRANCH;
  if (!expectedBranch) {
    console.error('[BLOCKED] Tests require EXPECTED_DB_BRANCH to positively identify the target');
    process.exit(1);
  }

  let actualEndpointIdentity = '';
  try {
    const url = new URL(dbUrl);
    const hostname = url.hostname;
    const firstLabel = hostname.split('.')[0] || '';
    actualEndpointIdentity = firstLabel.endsWith('-pooler')
      ? firstLabel.slice(0, -7)
      : firstLabel;
  } catch (e) {
    console.error('[BLOCKED] DATABASE_URL is invalid or missing');
    process.exit(1);
  }

  if (expectedBranch !== actualEndpointIdentity) {
    console.error(`[BLOCKED] DATABASE_URL endpoint identity does not exactly match EXPECTED_DB_BRANCH (${expectedBranch})`);
    process.exit(1);
  }
}
