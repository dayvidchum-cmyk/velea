import { getDayField } from './panchang/service.js';
import { resolveDaySky } from './panchang/resolve-day-sky.js';

async function run() {
  const date = '2026-06-17';
  const sky = resolveDaySky({ dateStr: date }); // app default — explicit, not silent

  console.log('=== David (Virgo Lagna) ===');
  const davidField = await getDayField(date, false, sky, 'Virgo');
  console.log({
    date: davidField?.date,
    moonSign: davidField?.moonSign,
    house: davidField?.houseActivated,
    baseMode: davidField?.baseMode,
    finalMode: davidField?.finalMode,
    mode: davidField?.mode,
  });
  
  console.log('\n=== Lang (Taurus Lagna) ===');
  const langField = await getDayField(date, false, sky, 'Taurus');
  console.log({
    date: langField?.date,
    moonSign: langField?.moonSign,
    house: langField?.houseActivated,
    baseMode: langField?.baseMode,
    finalMode: langField?.finalMode,
    mode: langField?.mode,
  });
  
  process.exit(0);
}

run().catch(console.error);
