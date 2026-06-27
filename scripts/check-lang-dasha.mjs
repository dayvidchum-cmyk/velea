// Quick check: what dasha does the calculator produce for Lang's stored Moon data?
// Moon: Chitra nakshatra, Libra, longitude 181.009656°
// Birth: 1989-11-24, Boston MA, America/New_York

import { calculateDashaTimeline } from '../server/dasha-calculator.js';

const result = calculateDashaTimeline(
  '1989-11-24',   // birthDate
  'Chitra',       // moonNakshatra
  'Libra',        // moonSign
  '1.009656',     // moonDegree
  '2026-06-24',   // today
  '181.009656'    // moonLongitude (full sidereal)
);

console.log('Starting dasha lord:', result.startingDashaLord);
console.log('Current Mahadasha:', result.currentMahadasha);
console.log('Current Antardasha:', result.currentAntardasha);
console.log('Moon nakshatra:', result.moonNakshatra);

const curr = result.entries.find(e => e.isCurrent);
if (curr) {
  console.log('\nCurrent entry:');
  console.log('  Mahadasha:', curr.mahadasha);
  console.log('  Antardasha:', curr.antardasha);
  console.log('  Start:', curr.startDate);
  console.log('  End:', curr.endDate);
}

// Also show the Venus mahadasha entries to find Venus/Saturn
const venusSaturn = result.entries.find(e => e.mahadasha === 'Venus' && e.antardasha === 'Saturn');
if (venusSaturn) {
  console.log('\nVenus/Saturn antardasha:');
  console.log('  Start:', venusSaturn.startDate);
  console.log('  End:', venusSaturn.endDate);
  console.log('  isCurrent:', venusSaturn.isCurrent);
}
