/**
 * Generate a video using Sats4AI L402 API (async service).
 *
 * Usage:
 *   node generate-video.mjs "A robot dancing in Times Square"
 *
 * Requires: Node.js 18+ (built-in fetch)
 */

import { requestL402, completeL402, pollJob } from "../../lib/l402-client.mjs";
import { createInterface } from "readline";

const prompt = process.argv[2] || "A robot dancing in Times Square";

console.log(`Requesting video: '${prompt}'`);

const body = { prompt, duration: 5 };

// Step 1: Request → 402
const challenge = await requestL402("generate-video", body);

let result;
if (challenge.alreadyPaid) {
  result = challenge.result;
} else {
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
  result = await completeL402(challenge, body, preimage);
}

// Handle async response
const responseBody = result?.body || result;

if (responseBody?.requestId) {
  const { requestId } = responseBody;
  console.log(`\nJob submitted: ${requestId}`);
  console.log("Polling for completion...");

  while (true) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await pollJob(requestId, "video");
    console.log(`  Status: ${status.status}`);

    if (status.status === "COMPLETED") {
      console.log(`\nVideo ready: ${status.result?.url}`);
      break;
    } else if (status.status === "FAILED") {
      console.log(`\nJob failed:`, status);
      break;
    }
  }
} else {
  console.log("Response:", responseBody);
}
