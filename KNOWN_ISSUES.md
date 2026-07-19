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

## Deferred for scale: unbounded layer cache

`server/layers/index.ts` caches `getCurrentLayers()` results in a module-level
`Map` keyed by `profileId` (5-min TTL). Entries are never evicted on TTL expiry —
they're only overwritten on next access — so the map grows by one entry per
distinct profile ever seen and is bounded only by total profile count. Negligible
at launch/tester scale; revisit before large multi-tenant load (add LRU/size cap
or periodic sweep). Note: per-process, so it also resets on restart and isn't
shared across replicas (correctness-safe, just lower hit rate).

Status: open. Ship as-is for launch.

## Deferred for scale: swisseph CPU serialization under load

Three module-level Swiss Ephemeris singletons (`server/vedic/natal-chart-engine.ts`,
`server/panchang/astronomy.ts`, `server/birthchart/calculator.ts`) perform
synchronous, CPU-bound calculations. Under heavy concurrent astrology requests
(chart calc, transit pressure), these serialize on the Node event loop and can
add latency. Correctness is fine (stateless calc, consistent ayanamsa). If/when
load warrants: move ephemeris work to a worker thread/pool or precompute & cache.

Status: open. Ship as-is for launch.

## Deploy-ordering: migration-gated columns (noted 2026-07-19 audit)
`profiles.hometown*`, `profile_day_locations`, and `waitlist` are created by DAVID-RUN scripts
(add-location-model.ts / reconcile-prod-schema.ts), not auto-migrated. Because schema.ts declares
these columns, a code deploy BEFORE the script runs makes every `select().from(profiles)` 500.
RULE: run the migration script, THEN deploy the code. Prod migrations HAVE run (David, 2026-07-18),
so this is a future-deploy caution, not a live issue. No runtime guard by design (no-auto-migrate law).
