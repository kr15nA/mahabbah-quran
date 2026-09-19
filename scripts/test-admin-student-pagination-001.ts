import { searchStudents } from '../lib/db/queries/students';

async function run() {
  console.log('Testing ADMIN-STUDENT-PAGINATION-001...');
  let failed = false;

  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      console.error(`FAIL: ${msg}`);
      failed = true;
    } else {
      console.log(`PASS: ${msg}`);
    }
  };

  // 1. Basic pagination page 1 size 10
  const r1 = await searchStudents('', {}, { limit: 10, offset: 0 });
  assert(r1.data.length <= 10, `Page 1, size 10 returned ${r1.data.length} records.`);
  
  // 2. Out of bounds offset
  const outOfBounds = await searchStudents('', {}, { limit: 10, offset: 999999 });
  assert(outOfBounds.data.length === 0, `Out of bounds offset returned data`);
  assert(r1.total === outOfBounds.total, `Out of bounds total mismatch: ${outOfBounds.total} != ${r1.total}`);

  // 3. Stable sorting check & adjacent page tests
  if (r1.total > 20) {
    const p1 = await searchStudents('', {}, { limit: 10, offset: 0 });
    const p2 = await searchStudents('', {}, { limit: 10, offset: 10 });
    const p3 = await searchStudents('', {}, { limit: 10, offset: 20 });
    
    const p1Ids = new Set(p1.data.map(d => d.id));
    const p2Ids = new Set(p2.data.map(d => d.id));
    const p3Ids = new Set(p3.data.map(d => d.id));
    
    let overlap = false;
    for (const id of p2Ids) if (p1Ids.has(id) || p3Ids.has(id)) overlap = true;
    assert(!overlap, `Adjacent page IDs do not overlap`);
    
    const p30 = await searchStudents('', {}, { limit: 30, offset: 0 });
    const combinedIds = [...p1.data, ...p2.data, ...p3.data].map(d => d.id);
    const p30Ids = p30.data.map(d => d.id);
    assert(JSON.stringify(combinedIds) === JSON.stringify(p30Ids), `Adjacent page combined IDs match expected stable ordered slice`);
  }

  // 4. Different page sizes
  for (const size of [10, 30, 50, 100]) {
    const res = await searchStudents('', {}, { limit: size, offset: 0 });
    assert(res.data.length <= size, `Page size ${size} returns <= ${size} records`);
  }

  // 5. Zero-result search
  const zeroResult = await searchStudents('THIS_WILL_NEVER_MATCH_123', {}, { limit: 10, offset: 0 });
  assert(zeroResult.data.length === 0 && zeroResult.total === 0, `Zero-result search returns data=[], total=0`);

  // 6. Filtered total consistency
  const filtered = await searchStudents('', { status: 'active' }, { limit: 10, offset: 0 });
  assert(filtered.total >= filtered.data.length, `Filtered total (${filtered.total}) >= data length`);

  if (failed) {
    throw new Error('One or more tests failed.');
  }

  console.log('ALL PAGINATION TESTS PASS.');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
