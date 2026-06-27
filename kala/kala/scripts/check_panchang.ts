import { calcPanchang } from '../server/panchang/astronomy';

// Boston coordinates
const result = await calcPanchang('2026-05-22', 42.3601, -71.0589);
console.log(JSON.stringify(result, null, 2));

// Also check May 23
const result2 = await calcPanchang('2026-05-23', 42.3601, -71.0589);
console.log('\n--- May 23 ---');
console.log(JSON.stringify(result2, null, 2));
