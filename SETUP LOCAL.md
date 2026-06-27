# Running Kala Locally - Setup Guide

This guide walks you through running Kala on your Mac for development.
No Manus, no cloud hosting, just on your laptop.

---

## Prerequisites

You'll need to install three things if you don't have them:

### 1. Node.js (v20 or newer)

Check if installed:
```bash
node --version
```

If not installed, download from https://nodejs.org/ (LTS version).

### 2. pnpm (package manager)

```bash
npm install -g pnpm
```

Verify:
```bash
pnpm --version
```

### 3. MySQL 8

Easiest path on Mac: use Homebrew.

If you don't have Homebrew: https://brew.sh

Then:
```bash
brew install mysql
brew services start mysql
```

Set a root password (or use empty for local-only):
```bash
mysql_secure_installation
```

Verify MySQL is running:
```bash
mysql -u root -p
```

Type your password, you should land in the MySQL prompt. Type `exit` to leave.

---

## Project Setup

### Step 1: Extract your project

You already have the zip. Extract it somewhere stable like `~/projects/kala`.

```bash
cd ~/projects
unzip ~/Downloads/the-hours.zip -d kala
cd kala
```

(Adjust paths to wherever you actually saved it.)

### Step 2: Replace two files with the local versions

I've prepared two modified files. Replace these in your project:

**Replace `vite.config.ts`** with the version provided (`vite.config.ts` in setup folder).
- Removes Manus runtime plugins
- Keeps everything else identical

**Replace `server/_core/context.ts`** with the version provided (`context.ts` in setup folder).
- Adds local dev bypass for authentication
- Keeps Manus OAuth working for when you redeploy

### Step 3: Create `.env` file

In the project root (same folder as `package.json`), create a file called `.env`.

Copy the contents of `.env.example` from setup folder into it.

Edit the `DATABASE_URL` line - replace `yourpassword` with your actual MySQL root password.

If you used an empty password during MySQL setup:
```
DATABASE_URL=mysql://root@localhost:3306/kala
```

### Step 4: Install dependencies

In the project root:
```bash
pnpm install
```

This takes 1-3 minutes. Some warnings are normal.

### Step 5: Create the database

```bash
mysql -u root -p -e "CREATE DATABASE kala;"
```

### Step 6: Run database migrations

```bash
pnpm db:push
```

This creates all the tables (users, profiles, tasks, panchang, etc.) in your local kala database.

### Step 7: Start the dev server

```bash
pnpm dev
```

You should see output ending with something like:
```
Server listening on port 3000
```

### Step 8: Open the app

In your browser:
```
http://localhost:3000
```

The first time you load it, the local bypass will create a user record and you'll land in the app as the local dev user.

---

## What to do first inside the app

Once it loads, you'll be a brand new user with no birth data. You'll need to:

1. Go to More → Profiles
2. Create a profile with your birth data (or restore David Chum's data manually if you have it)
3. The natal chart will compute, and Today/Planner will populate

---

## Daily workflow

To start working:
```bash
cd ~/projects/kala
pnpm dev
```

To stop: Ctrl+C in the terminal.

MySQL keeps running in the background. To stop it:
```bash
brew services stop mysql
```

To start it again:
```bash
brew services start mysql
```

---

## Troubleshooting

**"DATABASE_URL is required"**
Your `.env` file isn't being read. Make sure it's in the project root (same folder as `package.json`), and named exactly `.env` (not `.env.txt`).

**"ECONNREFUSED ::1:3306"**
MySQL isn't running. Start it: `brew services start mysql`

**"Access denied for user 'root'"**
Password in `DATABASE_URL` doesn't match your MySQL root password. Fix the `.env`.

**"Database 'kala' doesn't exist"**
Run step 5 again.

**Migration errors on first run**
Drop and recreate the database, then re-run migrations:
```bash
mysql -u root -p -e "DROP DATABASE kala; CREATE DATABASE kala;"
pnpm db:push
```

**Port 3000 already in use**
Change `PORT=3000` in `.env` to `PORT=3001` (or any free port).

---

## What you can do now

- Edit code, see changes live (Vite hot-reloads)
- Test new features without burning Manus credits
- Run the diagnostic scripts (`npx tsx server/diag-mode-bug.ts`)
- Inspect the database directly with `mysql` or a GUI like TablePlus

When you're ready to deploy to a host (Railway, Vercel, etc.), the same codebase works - you just point `DATABASE_URL` at the hosted DB and set `LOCAL_DEV=false`.

---

## What you don't have locally

- Manus OAuth login (bypassed)
- Manus session replay/debug collector (removed from vite config)
- Any data from the deployed Manus version (fresh DB)

Everything else - mode engine, panchang calculations, profiles, tasks, design system - is identical to deployed.
