/**
 * Minimal L402 client for Sats4AI.
 *
 * Handles the 3-step L402 flow:
 *   1. POST request → 402 with macaroon + invoice
 *   2. Pay invoice externally
 *   3. Retry with Authorization: L402 <macaroon>:<preimage>
 *
 * Usage:
 *   import { requestL402, completeL402, getModels, pollJob } from "./lib/l402-client.mjs";
 *
 *   const challenge = await requestL402("generate-image", { input: { prompt: "a cat" } });
 *   // pay challenge.invoice with your wallet, get preimage
 *   const result = await completeL402(challenge, { input: { prompt: "a cat" } }, "abc123...");
 */

const BASE_URL = "https://sats4ai.com/api/l402";

/**
 * Step 1: Send request, expect 402, extract macaroon + invoice.
 * @param {string} service - Service name (e.g. "generate-image")
 * @param {object} body - Request body
 * @returns {{ macaroon: string, invoice: string, service: string }}
 */
export async function requestL402(service, body) {
  const resp = await fetch(`${BASE_URL}/${service}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (resp.status === 200) {
    return { alreadyPaid: true, result: await resp.json() };
  }

  if (resp.status !== 402) {
    throw new Error(`Expected 402, got ${resp.status}: ${await resp.text()}`);
  }

  const wwwAuth = resp.headers.get("www-authenticate") || "";
  const macaroon = extract(/macaroon="([^"]+)"/, wwwAuth);
  const invoice = extract(/invoice="([^"]+)"/, wwwAuth);

  if (!macaroon || !invoice) {
    throw new Error("Missing macaroon or invoice in www-authenticate header");
  }

  return { macaroon, invoice, service };
}

/**
 * Step 3: Resend original request with L402 authorization.
 * @param {{ macaroon: string, service: string }} challenge - From requestL402()
 * @param {object} body - Same request body as step 1
 * @param {string} preimage - Hex-encoded preimage from Lightning payment
 * @returns {object} API response
 */
export async function completeL402(challenge, body, preimage) {
  if (challenge.alreadyPaid) return challenge.result;

  const resp = await fetch(`${BASE_URL}/${challenge.service}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `L402 ${challenge.macaroon}:${preimage}`,
    },
    body: JSON.stringify(body),
  });

  if (resp.status !== 200 && resp.status !== 202) {
    throw new Error(`L402 auth failed (${resp.status}): ${await resp.text()}`);
  }

  return resp.json();
}

/**
 * Fetch available models and pricing (free, no auth).
 */
export async function getModels() {
  const resp = await fetch(`${BASE_URL}/models`);
  if (!resp.ok) throw new Error(`Failed to fetch models: ${resp.status}`);
  return resp.json();
}

/**
 * Poll an async job status (free, no auth).
 * @param {string} requestId
 * @param {string} jobType - e.g. "video", "3d", "ai-call"
 */
export async function pollJob(requestId, jobType) {
  const resp = await fetch(
    `${BASE_URL}/job-status?requestId=${encodeURIComponent(requestId)}&jobType=${encodeURIComponent(jobType)}`
  );
  if (!resp.ok) throw new Error(`Failed to poll job: ${resp.status}`);
  return resp.json();
}

function extract(regex, text) {
  const m = text.match(regex);
  return m ? m[1] : null;
}
