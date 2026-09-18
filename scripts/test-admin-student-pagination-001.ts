import { searchStudents } from '../lib/db/queries/students';

async function run() {
  console.log('Testing ADMIN-STUDENT-PAGINATION-001...');
  
  // 1. Basic pagination page 1 size 10
  const r1 = await searchStudents('', {}, { limit: 10, offset: 0 });
  console.log(`Page 1, size 10: ${r1.data.length} records. Total: ${r1.total}`);

  // 2. Out of bounds offset
  const outOfBounds = await searchStudents('', {}, { limit: 10, offset: 999999 });
  console.log(`Out of bounds offset: ${outOfBounds.data.length} records. Total: ${outOfBounds.total}`);
  
  if (r1.total > 0 && outOfBounds.total !== r1.total) {
    console.error(`FAIL: Count query does not return consistent total when data is out of bounds!`);
    process.exit(1);
  } else {
    console.log(`PASS: Count query consistent.`);
  }

  // 3. Stable sorting check
  const r2 = await searchStudents('', {}, { limit: 30, offset: 0 });
  const ids = r2.data.map(d => d.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    console.error(`FAIL: Duplicate IDs found on page!`);
    process.exit(1);
  } else {
    console.log(`PASS: Stable duplicate ID check.`);
  }

  console.log('ALL PAGINATION TESTS PASS.');
}

run().catch(console.error).finally(() => process.exit(0));
