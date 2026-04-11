# sats4ai-l402-examples

**Code examples for integrating with Sats4AI's L402 API — 33+ pay-per-use AI tools with Bitcoin Lightning.**

No signup. No API keys. No KYC. Just HTTP requests + Lightning payments.

## What is L402?

L402 lets you pay for API access with Bitcoin instead of signing up for accounts. The flow:

1. **Send a request** → server returns `402 Payment Required` with a Lightning invoice
2. **Pay the invoice** → your wallet gives you a `preimage` (proof of payment)
3. **Resend with proof** → `Authorization: L402 <macaroon>:<preimage>`

That's it. Works with any HTTP client and any Lightning wallet.

## Quick Start

### curl (simplest)

```bash
# Step 1: Request → get 402 + invoice
curl -s -D - -o /dev/null -X POST https://sats4ai.com/api/l402/generate-image \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "a cat in space"}}' 2>&1 | grep -i www-authenticate

# Step 2: Pay the invoice with any Lightning wallet

# Step 3: Resend with proof
curl -X POST https://sats4ai.com/api/l402/generate-image \
  -H "Content-Type: application/json" \
  -H "Authorization: L402 <macaroon>:<preimage>" \
  -d '{"input": {"prompt": "a cat in space"}}'
```

See [examples/curl/](examples/curl/) for complete scripts.

### Python

```bash
pip install requests
```

```python
from lib.l402_client import L402Client

client = L402Client()

# Get invoice
invoice_data = client.request("generate-image", {"input": {"prompt": "a cat in space"}})
print(f"Pay this invoice: {invoice_data['invoice']}")

# After paying, submit proof
preimage = input("Enter preimage from wallet: ")
result = client.complete(invoice_data, preimage)
```

See [examples/python/](examples/python/) for all services.

### Node.js

```javascript
// Node.js 18+ (built-in fetch, no dependencies needed)
import { requestL402, completeL402 } from "./lib/l402-client.mjs";

// Get invoice
const challenge = await requestL402("generate-image", {
  input: { prompt: "a cat in space" },
});
console.log(`Pay this invoice: ${challenge.invoice}`);

// After paying, submit proof
const preimage = "your_preimage_here";
const result = await completeL402(challenge, { input: { prompt: "a cat in space" } }, preimage);
```

See [examples/node/](examples/node/) for all services.

## Available Services

### AI Generation
| Endpoint | Description | Price |
|----------|-------------|-------|
| `generate-image` | Image from text prompt | 100-200 sats |
| `generate-text` | AI chat / text completion | ~1 sat/100 chars |
| `generate-video` | Video from text (async) | 300-550 sats/sec |
| `animate-image` | Video from image (async) | 100 sats/sec |
| `generate-music` | Music with AI vocals | 100 sats |
| `generate-3d-model` | Photo to 3D GLB (async) | 350 sats |
| `translate-text` | Translate (119 languages) | ~1 sat/1000 chars |

### Audio & Speech
| Endpoint | Description | Price |
|----------|-------------|-------|
| `text-to-speech` | Text to audio (467 voices, 29 languages) | 300 sats |
| `transcribe-audio` | Audio to text (async) | 10 sats/min |
| `clone-voice` | Clone voice from audio | 7,500 sats |
| `epub-audiobook` | Book to audiobook (async) | 500+ sats |

### Image Processing
| Endpoint | Description | Price |
|----------|-------------|-------|
| `remove-background` | Remove background, transparent PNG (BiRefNet) | 5 sats |
| `upscale-image` | Upscale 2x/4x with Real-ESRGAN | 5 sats |
| `restore-face` | Restore blurry/damaged faces (CodeFormer) | 5 sats |
| `colorize-image` | Colorize B&W photos (DDColor) | 5 sats |
| `deblur-image` | Remove camera-shake blur (NAFNet) | 20 sats |
| `detect-nsfw` | Classify image safety | 2 sats |
| `detect-objects` | Detect objects with bounding boxes | 5 sats |
| `remove-object` | Remove objects by description — no mask | 15 sats |
| `edit-image` | AI image editing | 200-450 sats |

### Vision & Documents
| Endpoint | Description | Price |
|----------|-------------|-------|
| `analyze-image` | Describe image content | 21 sats |
| `extract-document` | OCR (PDF/image to text) | 10 sats/page |
| `extract-receipt` | Receipt to structured JSON | 50 sats |
| `convert-file` | Convert between 200+ formats | 100 sats |
| `merge-pdfs` | Merge PDFs into one | 100 sats |
| `convert-html-to-pdf` | HTML/Markdown to PDF | 50 sats |

### Communication
| Endpoint | Description | Price |
|----------|-------------|-------|
| `send-email` | Send email to any address | 200 sats |
| `send-sms` | SMS worldwide | varies |
| `place-call` | Automated phone call | varies |
| `ai-call` | AI voice agent call (async) | varies |

**Free endpoints** (no payment required):
- `GET /api/l402/models` — list all models and pricing
- `GET /api/l402/job-status?requestId=...&jobType=...` — poll async jobs

## Service Discovery

Machine-readable manifests for agents:

```bash
# Full service catalog with pricing, quality benchmarks, and performance metadata
GET https://sats4ai.com/.well-known/l402-services

# MCP tool catalog with latency (p50/p95), reliability, and failure modes
GET https://sats4ai.com/api/mcp/discovery

# Semantic search — find tools by capability
GET https://sats4ai.com/api/discover?q=translate

# Per-service metadata with enums and input schemas
GET https://sats4ai.com/api/l402/{service}
```

Every paid service includes **performance metadata** (latency p50/p95, reliability rating, known failure modes) so agents can make informed routing decisions.

## Async Services

Video, 3D, transcription, AI calls, and audiobook endpoints return `202 Accepted` with a `poll_url`:

```json
{
  "status": 202,
  "body": {
    "requestId": "pred_abc123",
    "status": "processing",
    "poll_url": "/api/l402/job-status?requestId=pred_abc123&jobType=video",
    "poll_interval_ms": 5000
  }
}
```

Poll until `status` is `COMPLETED`, then read `result`.

## Error Handling & Refunds

All services use **prepaid billing** with instant invoice settlement. If a service fails after payment:

- The error response includes an `error_code` field identifying the failure type
- The error response includes a `refund` object with an `lnurl_withdraw` field
- Claim the refund with any Lightning wallet that supports LNURL-withdraw
- First 2 failures per 15-minute window: full refund. After that: 2 sat routing fee deducted.

**Example error response:**
```json
{
  "error": "Image generation timed out",
  "error_code": "TIMEOUT",
  "refund": {
    "charge_id": 12345,
    "refund_amount": 200,
    "lnurl_withdraw": "lnurl1dp68gurn8ghj7...",
    "status": "pending"
  }
}
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `TIMEOUT` | Service timed out | Retry later or try different model |
| `CONTENT_FILTERED` | Safety filter triggered | Rephrase prompt |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `INVALID_INPUT` | Bad parameters | Fix request parameters |
| `SERVICE_ERROR` | Service failure | Try different model |

### Refund Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `charge_id` | number | ID of the original charge |
| `refund_amount` | number | Amount in sats being refunded |
| `lnurl_withdraw` | string | Bech32-encoded LNURL-withdraw link |
| `status` | string | Refund status (`pending`, `claimed`, `expired`) |

**Claiming the refund:**
- **CLI**: Paste the `lnurl_withdraw` value into any LNURL-compatible wallet
- **Programmatic**: Decode the bech32 LNURL to get the callback URL, then follow the [LNURL-withdraw spec](https://github.com/lnurl/luds/blob/luds/03.md)

## Authentication Format

**L402 scheme** (recommended):
```
Authorization: L402 <base64_macaroon>:<hex_preimage>
```

**MPP/Payment scheme** (IETF draft):
```
Authorization: Payment <base64url_json>
```
Where the JSON is `{"challenge": {"id": "<chargeId>", "macaroon": "<base64>"}, "payload": {"preimage": "<hex>"}}`

Both are returned in the `www-authenticate` header. Use whichever your client supports.

**Token expiry:** L402 tokens are valid for **10 minutes** after the 402 response. Pay the invoice and submit your authorized request within that window.

## Pair with MCP

If you're using an MCP-compatible AI (Claude, Cursor, etc.), you don't need this repo. Just use the MCP server:

```json
{
  "mcpServers": {
    "sats4ai": {
      "url": "https://sats4ai.com/api/mcp"
    }
  }
}
```

See the [MCP repo](https://github.com/cnghockey/sats4ai-mcp-server) for setup instructions.

## Links

- **Website**: [sats4ai.com](https://sats4ai.com)
- **L402 Docs**: [sats4ai.com/l402](https://sats4ai.com/l402)
- **MCP Server**: [github.com/cnghockey/sats4ai-mcp-server](https://github.com/cnghockey/sats4ai-mcp-server)
- **Service Discovery**: [sats4ai.com/.well-known/l402-services](https://sats4ai.com/.well-known/l402-services)
- **Semantic Search**: [sats4ai.com/api/discover](https://sats4ai.com/api/discover)

## License

MIT
