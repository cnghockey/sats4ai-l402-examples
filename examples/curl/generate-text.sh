#!/bin/bash
# Generate text using Sats4AI L402 API
#
# Usage: ./generate-text.sh "Write a haiku about Bitcoin"

set -euo pipefail

MESSAGE="${1:-Write a haiku about Bitcoin}"
ENDPOINT="https://sats4ai.com/api/l402/generate-text"

echo "==> Requesting text: '$MESSAGE'"
echo ""

# Step 1: Send request, capture 402 response
HEADERS=$(mktemp)
BODY=$(curl -s -D "$HEADERS" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"input\": [{\"role\": \"user\", \"content\": \"$MESSAGE\"}]}")

STATUS=$(head -1 "$HEADERS" | grep -oP '\d{3}')

if [ "$STATUS" = "200" ]; then
  echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('body',''))" 2>/dev/null || echo "$BODY"
  rm "$HEADERS"
  exit 0
fi

if [ "$STATUS" != "402" ]; then
  echo "ERROR: Expected 402, got $STATUS"
  echo "$BODY"
  rm "$HEADERS"
  exit 1
fi

# Extract L402 challenge
WWW_AUTH=$(grep -i 'www-authenticate.*L402' "$HEADERS")
MACAROON=$(echo "$WWW_AUTH" | grep -oP 'macaroon="([^"]+)"' | sed 's/macaroon="//;s/"//')
INVOICE=$(echo "$WWW_AUTH" | grep -oP 'invoice="([^"]+)"' | sed 's/invoice="//;s/"//')
rm "$HEADERS"

echo "==> Invoice to pay:"
echo "$INVOICE"
echo ""
read -rp "Preimage (hex): " PREIMAGE

# Step 3: Resend with proof
echo ""
echo "==> Submitting with L402 proof..."
RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: L402 ${MACAROON}:${PREIMAGE}" \
  -d "{\"input\": [{\"role\": \"user\", \"content\": \"$MESSAGE\"}]}")

echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('body',''))" 2>/dev/null || echo "$RESULT"
