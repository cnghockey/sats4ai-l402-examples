/**
 * List all available models and pricing (free, no auth required).
 *
 * Usage:
 *   node list-models.mjs
 *
 * Requires: Node.js 18+ (built-in fetch)
 */

import { getModels } from "../../lib/l402-client.mjs";

const models = await getModels();

if (Array.isArray(models)) {
  console.log(`${"ID".padEnd(5)} ${"Service".padEnd(20)} ${"Model".padEnd(30)} Price`);
  console.log("-".repeat(80));

  for (const m of models) {
    const id = String(m.id ?? "?").padEnd(5);
    const service = (m.service || m.type || "?").padEnd(20);
    const name = (m.name || m.model || "?").padEnd(30);
    const price = m.price || m.pricing || "?";
    console.log(`${id} ${service} ${name} ${price}`);
  }
} else {
  console.log(models);
}
