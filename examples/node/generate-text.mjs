/**
 * Generate text using Sats4AI L402 API.
 *
 * Usage:
 *   node generate-text.mjs "Write a haiku about Bitcoin"
 *
 * Requires: Node.js 18+ (built-in fetch)
 */

import { requestL402, completeL402 } from "../../lib/l402-client.mjs";
import { createInterface } from "readline";

const message = process.argv[2] || "Write a haiku about Bitcoin";

console.log(`Requesting text: '${message}'`);

const body = { input: [{ role: "user", content: message }] };

// Step 1: Request → 402
const challenge = await requestL402("generate-text", body);

if (challenge.alreadyPaid) {
  console.log(challenge.result?.body || challenge.result);
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
console.log(`\n${result?.body || JSON.stringify(result)}`);
