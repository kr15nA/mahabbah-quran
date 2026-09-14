const fs = require('fs');
const files = [
  'app/admin/keuangan/ziswaf/donatur/page.tsx',
  'app/admin/keuangan/ziswaf/program/page.tsx',
  'app/admin/keuangan/ziswaf/penerimaan/page.tsx',
  'app/admin/keuangan/ziswaf/penerimaan/baru/page.tsx',
  'app/admin/keuangan/ziswaf/penerimaan/[id]/page.tsx',
  'app/admin/keuangan/ziswaf/penerimaan/[id]/cetak/page.tsx',
  'app/api/finance/ziswaf/parties/route.ts',
  'app/api/finance/ziswaf/campaigns/route.ts',
  'app/api/finance/ziswaf/receipts/route.ts',
  'app/api/finance/ziswaf/receipts/[id]/route.ts',
  'app/api/finance/ziswaf/receipts/[id]/confirm/route.ts',
  'app/api/finance/ziswaf/receipts/[id]/cancel/route.ts',
  'app/api/finance/ziswaf/receipts/[id]/refund/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const session = await requireAuth\(\)/g, 'const { session } = await requireAuth()');
  // also fix 0n in [id]/page.tsx
  content = content.replace(/0n/g, 'BigInt(0)');
  fs.writeFileSync(file, content);
}
console.log('Fixed auth requires');
