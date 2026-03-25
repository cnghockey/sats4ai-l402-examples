"""
Generate text using Sats4AI L402 API.

Usage:
    python generate_text.py "Write a haiku about Bitcoin"

Requires: pip install requests
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from lib.l402_client import L402Client

message = sys.argv[1] if len(sys.argv) > 1 else "Write a haiku about Bitcoin"

client = L402Client()

# Step 1: Request → 402
print(f"Requesting text: '{message}'")
challenge = client.request("generate-text", {
    "input": [{"role": "user", "content": message}],
})

if challenge.get("already_paid"):
    print(challenge["result"].get("body", challenge["result"]))
    sys.exit(0)

# Step 2: Pay the invoice
print(f"\nInvoice to pay:\n{challenge['invoice']}\n")
preimage = input("Preimage (hex): ").strip()

# Step 3: Submit with proof
print("\nSubmitting with L402 proof...")
result = client.complete(challenge, preimage)

if isinstance(result, dict):
    print(f"\n{result.get('body', result)}")
else:
    print(f"\n{result}")
