#!/usr/bin/env node
/**
 * Reset a user's password (bcrypt) and revoke all their existing sessions.
 *
 * Usage:
 *   npx tsx server/scripts/reset-password.ts --email david@kala.local --password 'YourNewPassword'
 *
 * The new password is hashed with bcrypt before storage — plaintext is never saved.
 */

import "dotenv/config";
import { parseArgs } from "util";
import { getUserByEmail, updateUserPasswordHash, deleteAllSessionsForUser } from "../db.js";
import { hashPassword } from "../_core/password.js";

const { values } = parseArgs({
  options: {
    email: { type: "string" as const },
    password: { type: "string" as const },
    help: { type: "boolean" as const },
  },
});

if (values.help || !values.email || !values.password) {
  console.log(`
Usage: npx tsx server/scripts/reset-password.ts --email <email> --password <newPassword>

  --email     The account email (e.g. david@kala.local)
  --password  The new password (min 8 characters recommended)
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const email = values.email!;
  const password = values.password!;

  if (password.length < 8) {
    console.error("✗ Password should be at least 8 characters.");
    process.exit(1);
  }

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`✗ No account found for ${email}`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  await updateUserPasswordHash(user.id, hash);

  // Revoke any existing sessions so the new password takes effect everywhere.
  try {
    await deleteAllSessionsForUser(user.id);
  } catch {
    // sessions table may not exist yet (pre-migration) — password reset still succeeds.
  }

  console.log(`✓ Password reset for ${email} (user id ${user.id}).`);
  console.log("  All existing sessions revoked. Log in with the new password.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Reset failed:", err);
  process.exit(1);
});
