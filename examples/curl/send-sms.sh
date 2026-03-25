#!/bin/bash
# Send an SMS using Sats4AI L402 API
#
# Usage: ./send-sms.sh "+14155552671" "Hello from Sats4AI"

set -euo pipefail

PHONE="${1:?Usage: ./send-sms.sh <phone_number> <message>}"
MESSAGE="${2:?Usage: ./send-sms.sh <phone_number> <message>}"
ENDPOINT="https://sats4ai.com/api/l402/send-sms"

echo "==> Sending SMS to $PHONE: '$MESSAGE'"
echo ""

# Step 1: Request → 402
HEADERS=$(mktemp)
BODY=$(curl -s -D "$HEADERS" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"$PHONE\", \"message\": \"$MESSAGE\"}")

STATUS=$(head -1 "$HEADERS" | grep -oP '\d{3}')

if [ "$STATUS" = "200" ]; then
  echo "==> Sent! $BODY"
  rm "$HEADERS"
  exit 0
fi

if [ "$STATUS" != "402" ]; then
  echo "ERROR: Expected 402, got $STATUS"
  echo "$BODY"
  rm "$HEADERS"
  exit 1
fi

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
RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: L402 ${MACAROON}:${PREIMAGE}" \
  -d "{\"phone_number\": \"$PHONE\", \"message\": \"$MESSAGE\"}")

echo "==> Result: $RESULT"
