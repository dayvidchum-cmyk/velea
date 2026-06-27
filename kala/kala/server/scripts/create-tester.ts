#!/usr/bin/env node
/**
 * Create a tester account with a single profile and natal chart
 * Usage: npx tsx server/scripts/create-tester.ts --email tester@example.com --password ChangeMe123 --name "Jane Doe" --birthDate 1990-03-15 --birthTime 14:30 --birthLocation "New York, NY"
 */

import { parseArgs } from "util";
import { createUserWithPassword, getDb } from "../db.js";
import { hashPassword } from "../_core/password.js";
import { profiles } from "../../drizzle/schema.js";

const options = {
  email: { type: "string" as const },
  password: { type: "string" as const },
  name: { type: "string" as const },
  birthDate: { type: "string" as const }, // YYYY-MM-DD
  birthTime: { type: "string" as const }, // HH:MM
  birthLocation: { type: "string" as const }, // "City, State"
  help: { type: "boolean" as const },
};

const { values } = parseArgs({ options });

if (values.help || !values.email || !values.password || !values.name || !values.birthDate || !values.birthTime || !values.birthLocation) {
  console.log(`
Usage: npx tsx server/scripts/create-tester.ts [options]

Options:
  --email <email>              Email address for the account
  --password <password>        Password (min 6 characters)
  --name <name>                User's full name
  --birthDate <YYYY-MM-DD>     Birth date
  --birthTime <HH:MM>          Birth time in 24-hour format
  --birthLocation <City, State> Birth location
  --help                        Show this help message

Example:
  npx tsx server/scripts/create-tester.ts \\
    --email tester@example.com \\
    --password ChangeMe123 \\
    --name "Jane Doe" \\
    --birthDate 1990-03-15 \\
    --birthTime 14:30 \\
    --birthLocation "New York, NY"
  `);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  try {
    console.log("Creating tester account...");

    // Validate inputs
    if (values.password!.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(values.birthDate!)) {
      throw new Error("Birth date must be in YYYY-MM-DD format");
    }

    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(values.birthTime!)) {
      throw new Error("Birth time must be in HH:MM format");
    }

    // Hash password
    const passwordHash = await hashPassword(values.password!);

    // Create user with role='user' (not admin)
    const userIdResult = await createUserWithPassword({
      email: values.email!,
      name: values.name,
      passwordHash,
      role: "user",
    });
    const userId = (userIdResult as any).id ?? userIdResult;

    console.log(`✓ User created (ID: ${userId})`);

    // Create owner profile (single profile for non-admin users)
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const profileResult = await db.insert(profiles).values({
      userId: userId,
      name: values.name!,
      birthDate: values.birthDate!,
      birthTime: values.birthTime!,
      birthLocationCity: values.birthLocation!,
      birthLocationLat: null,
      birthLocationLon: null,
      birthTimezone: null,
      notes: null,
      isOwner: true,
      isActive: true,
    });

    const profileId = (profileResult as any).insertId ?? (profileResult as any)[0]?.insertId;
    console.log(`✓ Profile created (ID: ${profileId})`);

    console.log(`
✓ Tester account created successfully!

Login credentials:
  Email:    ${values.email}
  Password: ${values.password}
  Name:     ${values.name}
  Birth:    ${values.birthDate} at ${values.birthTime} in ${values.birthLocation}

The account has been created with role='user' and will not see the Profiles tab.
To give this user admin access, run:
  UPDATE users SET role = 'admin' WHERE id = ${userId};
    `);
  } catch (error) {
    console.error("✗ Error creating tester account:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
