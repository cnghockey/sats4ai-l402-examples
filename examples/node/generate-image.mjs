/**
 * Generate an image using Sats4AI L402 API.
 *
 * Usage:
 *   node generate-image.mjs "a cat wearing sunglasses"
 *
 * Requires: Node.js 18+ (built-in fetch)
 */

import { requestL402, completeL402 } from "../../lib/l402-client.mjs";
import { createInterface } from "readline";
import { writeFileSync } from "fs";

const prompt = process.argv[2] || "a cat in space";

console.log(`Requesting image: '${prompt}'`);

const body = { input: { prompt } };

// Step 1: Request → 402
const challenge = await requestL402("generate-image", body);

if (challenge.alreadyPaid) {
  console.log("Already paid! Result received.");
  process.exit(0);
}

// Step 2: Pay the invoice
console.log(`\nInvoice to pay:\n${challenge.invoice}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const preimage = await new Promise((resolve) =>
  rl.question("Preimage (hex): ", (answer) => {
    rl.close();
    resolve(answer.trim());
  })
);

// Step 3: Submit with proof
console.log("\nSubmitting with L402 proof...");
const result = await completeL402(challenge, body, preimage);

const data = result?.body || result;
if (typeof data === "string" && (data.startsWith("data:") || data.length > 1000)) {
  const base64 = data.includes(",") ? data.split(",")[1] : data;
  const buffer = Buffer.from(base64, "base64");
  writeFileSync("output.png", buffer);
  console.log(`Image saved to output.png (${buffer.length} bytes)`);
} else {
  console.log("Response:", data);
}
