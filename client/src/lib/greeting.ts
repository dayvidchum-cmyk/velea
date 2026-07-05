// Personable, time-aware greetings — Velea's "second voice," a friend noticing the hour.
// Each bucket holds a few variants; we rotate by calendar day so the same hour on a
// different day says something different (stable within a day → no flicker on re-render).
// {name} is the profile's first name; a nameless profile drops it cleanly.
//
// This copy is also the seed for future lock-screen push notifications — the greeting
// engine and the notification voice are the same thing.

type Bucket = { from: number; to: number; lines: string[] };

// Ordered, non-overlapping hour ranges covering 0–23 (local device hour).
const BUCKETS: Bucket[] = [
  // Deep night — the "still up?" moment
  { from: 0, to: 4, lines: [
    "Still up, {name}?",
    "Can't sleep, {name}?",
    "The world's asleep, {name}.",
    "Late one, {name}?",
  ] },
  // Dawn — early riser
  { from: 5, to: 7, lines: [
    "Early one, {name}.",
    "Up before the sun, {name}.",
    "Morning's yours, {name}.",
  ] },
  // Morning
  { from: 8, to: 11, lines: [
    "Good morning, {name}.",
    "Morning, {name}.",
    "New day, {name}.",
  ] },
  // Midday / afternoon
  { from: 12, to: 16, lines: [
    "Good afternoon, {name}.",
    "Afternoon, {name}.",
    "How's the day, {name}?",
  ] },
  // Evening
  { from: 17, to: 20, lines: [
    "Good evening, {name}.",
    "Evening, {name}.",
    "Winding down, {name}?",
  ] },
  // Night
  { from: 21, to: 23, lines: [
    "Good night, {name}.",
    "Still going, {name}?",
    "Late night, {name}.",
  ] },
];

/** Full greeting line for the given moment + name (e.g. "Still up, Lang?"). */
export function pickGreeting(date: Date, firstName: string | null): string {
  const h = date.getHours();
  const bucket = BUCKETS.find((b) => h >= b.from && h <= b.to) ?? BUCKETS[BUCKETS.length - 1];
  const idx = date.getDate() % bucket.lines.length; // rotates daily, stable within the day
  const line = bucket.lines[idx];
  return firstName
    ? line.replace(/\{name\}/g, firstName)
    : line.replace(/,?\s*\{name\}/g, ""); // "Still up, {name}?" → "Still up?"
}
