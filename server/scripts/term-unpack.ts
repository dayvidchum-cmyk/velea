import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, MODEL } from "../narrative/prompts.js";

const term = process.argv.slice(2).join(" ") || "loss";

(async () => {
  const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: BASE_PROMPT,
    messages: [{
      role: "user",
      content: `Not a chart reading — a test of understanding only.

Unpack the human concept of "${term}" to the depth your instructions require: across its registers (outer/material and inner/psychological), across time (where it comes from and how it lives now), down to lived human experience, resolved into ONE continuous human thread. Do not recite a dictionary line — reach the depth your house dictionary and your home / self / roots calibration set. 4 to 6 sentences.`,
    }],
  });
  const b = msg.content.find((x) => x.type === "text");
  console.log(`TERM: ${term}\n`);
  console.log(b && b.type === "text" ? b.text.trim() : "(no output)");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
