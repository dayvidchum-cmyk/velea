import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const db = await createConnection(process.env.DATABASE_URL);

await db.execute(`
  CREATE TABLE IF NOT EXISTS \`system_prompts\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`key\` varchar(64) NOT NULL,
    \`title\` varchar(128) NOT NULL,
    \`content\` text NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`system_prompts_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`system_prompts_key_unique\` UNIQUE(\`key\`)
  )
`);

// Seed the default mode_logic prompt
await db.execute(`
  INSERT INTO \`system_prompts\` (\`key\`, \`title\`, \`content\`) VALUES (
    'mode_logic',
    'Day Mode Logic',
    'This is where you explain your logic behind the four day modes (Restraint, Build, Selective, Action). Describe when each mode applies, what it means for task selection, and how it relates to the panchang data.'
  ) ON DUPLICATE KEY UPDATE \`key\` = \`key\`
`);

console.log("✓ system_prompts table created and seeded");
await db.end();
