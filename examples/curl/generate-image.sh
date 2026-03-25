#!/bin/bash
# Generate an image using Sats4AI L402 API
#
# Usage: ./generate-image.sh "a cat wearing sunglasses"
#
# Requires: curl, jq, a Lightning wallet to pay the invoice

set -euo pipefail

PROMPT="${1:-a cat in space}"
ENDPOINT="https://sats4ai.com/api/l402/generate-image"

echo "==> Requesting image: '$PROMPT'"
echo ""

# Step 1: Send request, capture 402 response headers
HEADERS=$(mktemp)
BODY=$(curl -s -D "$HEADERS" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"input\": {\"prompt\": \"$PROMPT\"}}")

STATUS=$(head -1 "$HEADERS" | grep -oP '\d{3}')

if [ "$STATUS" = "200" ]; then
  echo "==> Already paid (cached?). Result:"
  echo "$BODY"
  rm "$HEADERS"
  exit 0
fi

if [ "$STATUS" != "402" ]; then
  echo "ERROR: Expected 402, got $STATUS"
  echo "$BODY"
  rm "$HEADERS"
  exit 1
fi

# Extract macaroon and invoice from www-authenticate header
WWW_AUTH=$(grep -i 'www-authenticate.*L402' "$HEADERS")
MACAROON=$(echo "$WWW_AUTH" | grep -oP 'macaroon="([^"]+)"' | sed 's/macaroon="//;s/"//')
INVOICE=$(echo "$WWW_AUTH" | grep -oP 'invoice="([^"]+)"' | sed 's/invoice="//;s/"//')
rm "$HEADERS"

echo "==> Invoice to pay:"
echo "$INVOICE"
echo ""
echo "Pay this invoice with any Lightning wallet, then enter the preimage."
echo ""
read -rp "Preimage (hex): " PREIMAGE

# Step 3: Resend with L402 authorization
echo ""
echo "==> Submitting with L402 proof..."
RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: L402 ${MACAROON}:${PREIMAGE}" \
  -d "{\"input\": {\"prompt\": \"$PROMPT\"}}")

echo "$RESULT" | head -c 200
echo ""
echo ""
echo "==> Done. Image returned as base64 (use jq to extract, pipe to base64 -d > image.png)"
