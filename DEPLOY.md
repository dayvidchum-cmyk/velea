# Deploying Kala to Railway

## How the deploy works
`railway.json` drives it:
- **Build**: Nixpacks runs `npm run build` (Vite client bundle + esbuild server bundle).
- **Pre-deploy** (runs once, before the new release goes live): `npm run db:deploy`
  → `drizzle-kit push --force` syncs the database to `drizzle/schema.ts` directly
  (non-interactive). On a fresh DB this creates the full schema; on later deploys it
  applies the delta. `schema.ts` is the single source of truth (not the migration
  journal), so every column is created — including ones added out-of-band.
- **Start**: `npm start` → `NODE_ENV=production node dist/index.js`.

A fresh Railway MySQL starts **empty** — the pre-deploy `db:deploy` is what creates
every table (`users`, `tasks`, `profiles`, `sessions`, …). Do not skip it.

> `npm run db:migrate` (interactive `drizzle-kit push`) is for **local** use — it
> prompts before destructive changes. The deploy uses `db:deploy` (`--force`,
> non-interactive) so it never hangs waiting for a prompt.

## Required environment variables (Railway → Variables)
| Var | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | from Railway MySQL plugin | Reference the MySQL service's connection URL. |
| `ANTHROPIC_API_KEY` | your Anthropic key | Powers the narrative reads. Without it, reads fall back to the deterministic (non-LLM) text — the app still works, but the prose is generic. Use the same key as local `.env`. |
| `JWT_SECRET` | a long random string | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and paste the output. |
| `NODE_ENV` | `production` | `start` also forces this; set it so pre-deploy/migrate match. |
| `PORT` | (leave unset) | Railway injects it; the app reads `process.env.PORT`. |

### Do NOT set
- `LOCAL_DEV` — leave it **unset**. It bypasses auth entirely (one shared user).
  Code also force-disables it whenever `NODE_ENV=production`, but don't set it.
- `LOCAL_USER_OPEN_ID` — irrelevant in production.

### No longer needed (omit them all)
The Manus/Forge integration is fully removed from the live path:
- Birth-location geocoding now uses **Nominatim** (no key) — `VITE_FRONTEND_FORGE_API_URL`,
  `VITE_FRONTEND_FORGE_API_KEY` are unused.
- The Manus OAuth redirect is gone (login is in-app) — `VITE_APP_ID`,
  `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`,
  `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` are unused.

> ✅ The client uses **no `VITE_*` variables** — there are no build-time env vars to
> set. (The `server/_core/{oauth,storageProxy,sdk,llm,…}.ts` files remain in the repo
> but are inert dead code: unmounted features guard missing env at request time and
> never run.)

## First deploy checklist
1. Provision a Railway **MySQL** service; copy its `DATABASE_URL` into the app service.
2. Set `JWT_SECRET` and `NODE_ENV=production`.
3. Deploy. Pre-deploy migrate creates the schema; the server starts.
4. Visit the URL → `/login` → **Sign up** → onboarding.
