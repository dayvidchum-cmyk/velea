# Deploying Kala to Railway

## How the deploy works
`railway.json` drives it:
- **Build**: Nixpacks runs `npm run build` (Vite client bundle + esbuild server bundle).
- **Pre-deploy** (runs once, before the new release goes live): `npm run db:migrate`
  → `drizzle-kit migrate` applies all committed migrations in `drizzle/` to the
  database (creates the full schema on a fresh DB; applies only new ones after).
- **Start**: `npm start` → `NODE_ENV=production node dist/index.js`.

A fresh Railway MySQL starts **empty** — the pre-deploy migrate is what creates
every table (`users`, `tasks`, `profiles`, `sessions`, …). Do not skip it.

## Required environment variables (Railway → Variables)
| Var | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | from Railway MySQL plugin | Reference the MySQL service's connection URL. |
| `JWT_SECRET` | a long random string | Set a strong value (Phase 3 will generate one). |
| `NODE_ENV` | `production` | `start` also forces this; set it so pre-deploy/migrate match. |
| `PORT` | (leave unset) | Railway injects it; the app reads `process.env.PORT`. |

### Do NOT set
- `LOCAL_DEV` — leave it **unset**. It bypasses auth entirely (one shared user).
  Code also force-disables it whenever `NODE_ENV=production`, but don't set it.
- `LOCAL_USER_OPEN_ID` — irrelevant in production.

### Legacy (only needed until the relevant feature is replaced)
- `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` — used by the
  birth-location geocoder. Being replaced with Nominatim (Phase 2.6); once that
  lands, these can be dropped.
- `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`,
  `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` — the Manus OAuth redirect is
  gone (Phase 1.3); these are unused. Safe to omit.

> ⚠️ `VITE_*` variables are **build-time** — they're baked into the client bundle
> during `npm run build`. They must exist in Railway's env at build time, not just
> at runtime.

## First deploy checklist
1. Provision a Railway **MySQL** service; copy its `DATABASE_URL` into the app service.
2. Set `JWT_SECRET` and `NODE_ENV=production`.
3. Deploy. Pre-deploy migrate creates the schema; the server starts.
4. Visit the URL → `/login` → **Sign up** → onboarding.
