import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test';

const cases = [
  { allow: undefined, env: undefined, dbUrl: 'fake', expected: 'DENIED' },
  { allow: 'true', env: undefined, dbUrl: 'fake', expected: 'DENIED' },
  { allow: 'true', env: '', dbUrl: 'fake', expected: 'DENIED' },
  { allow: 'true', env: 'invalid', dbUrl: 'fake', expected: 'DENIED' },
  { allow: 'true', env: 'development', dbUrl: 'ep-flat-waterfall-b3uvjas7-pooler', expected: 'DENIED' },
  { allow: 'true', env: 'development', dbUrl: 'ep-safe-dev', expected: 'ALLOWED' },
  { allow: 'true', env: 'qa', dbUrl: 'ep-safe-qa', expected: 'ALLOWED' },
];

let failed = 0;

for (const c of cases) {
  process.env.ALLOW_MUTATING_DB_TESTS = c.allow;
  process.env.MUTATING_DB_TEST_ENV = c.env;
  process.env.DATABASE_URL = c.dbUrl;

  let result = 'ALLOWED';
  const originalExit = process.exit;
  const originalError = console.error;
  
  try {
    process.exit = (() => { throw new Error('EXITED'); }) as any;
    console.error = () => {}; // suppress
    assertSafeMutatingDbTestEnvironment();
  } catch (e: any) {
    if (e.message === 'EXITED') result = 'DENIED';
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }

  if (result !== c.expected) {
    console.error(`FAIL: ${JSON.stringify(c)} -> got ${result}`);
    failed++;
  } else {
    console.log(`PASS: ${JSON.stringify(c)} -> ${result}`);
  }
}

if (failed === 0) {
  console.log('ALL GUARD TESTS PASS');
} else {
  process.exit(1);
}
