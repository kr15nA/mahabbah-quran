const fs = require('fs');
let content = fs.readFileSync('lib/finance/ziswaf.ts', 'utf8');
content = content.replace(/0n/g, 'BigInt(0)');
content = content.replace(/ \<= BigInt\(0\)/g, ' <= BigInt(0)');
fs.writeFileSync('lib/finance/ziswaf.ts', content);

let contentTest = fs.readFileSync('scripts/test-ziswaf-receipt-001.ts', 'utf8');
contentTest = contentTest.replace(/1000000n/g, 'BigInt(1000000)');
contentTest = contentTest.replace(/50000n/g, 'BigInt(50000)');
contentTest = contentTest.replace(/0n/g, 'BigInt(0)');
fs.writeFileSync('scripts/test-ziswaf-receipt-001.ts', contentTest);
