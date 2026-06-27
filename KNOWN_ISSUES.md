# Known Issues

## Pre-existing: date-sensitive tests drift as the real date advances

These tests assert fixed dates/ages computed relative to "today" and fail once
the calendar moves past their authored reference point. They are **not** caused
by the pressure-layer feature (their source modules were untouched) and should
be made deterministic (inject a fixed reference date / freeze time).

- `server/dasha-calculator.test.ts` › calculateDashaTimeline › "first entry starts at birth date"
- `server/profection/calculator.test.ts` › Profection Calculator › calculateProfectionYear › "should calculate age 37 profection year correctly"
- `server/profection/calculator.test.ts` › Profection Calculator › calculateProfectionYear › "should calculate age 38 profection year correctly"

Status: open. Do not block checkpoints on these.
