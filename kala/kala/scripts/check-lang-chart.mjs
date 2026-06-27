// Direct chart calculation for Lang: 1989-11-24, 17:32, Boston MA (America/New_York)
import { calculateBirthChart } from '../server/birthchart/calculator.js';

const result = await calculateBirthChart(
  '1989-11-18',
  '17:32',
  42.3601,
  -71.0589,
  'America/New_York'
);

console.log('Lagna:', result.lagna.sign, result.lagna.degree.toFixed(4));
console.log('');
console.log('Moon:');
console.log('  Sign:', result.moon.sign);
console.log('  Degree:', result.moon.degree.toFixed(6));
console.log('  Longitude:', result.moon.longitude.toFixed(6));
console.log('  Nakshatra:', result.moon.nakshatra);
console.log('  Pada:', result.moon.pada);
console.log('  House:', result.moon.house);
console.log('');
console.log('UTC birth:', result.utcBirthIso);
console.log('');
// Run dasha with this Moon data
const { calculateDashaTimeline } = await import('../server/dasha-calculator.js');
const dasha = calculateDashaTimeline(
  '1989-11-18',
  result.moon.nakshatra,
  result.moon.sign,
  String(result.moon.degree.toFixed(6)),
  '2026-06-24',
  String(result.moon.longitude.toFixed(6))
);
console.log('Dasha starting lord:', dasha.startingDashaLord);
console.log('Current Mahadasha:', dasha.currentMahadasha);
console.log('Current Antardasha:', dasha.currentAntardasha);
const curr = dasha.entries.find(e => e.isCurrent);
if (curr) console.log('Period:', curr.startDate, '->', curr.endDate);
