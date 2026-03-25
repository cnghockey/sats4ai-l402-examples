"""
Generate an image using Sats4AI L402 API.

Usage:
    python generate_image.py "a cat wearing sunglasses"

Requires: pip install requests
"""

import base64
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from lib.l402_client import L402Client

prompt = sys.argv[1] if len(sys.argv) > 1 else "a cat in space"

client = L402Client()

# Step 1: Request → 402
print(f"Requesting image: '{prompt}'")
challenge = client.request("generate-image", {"input": {"prompt": prompt}})

if challenge.get("already_paid"):
    print("Already paid! Result received.")
    sys.exit(0)

# Step 2: Pay the invoice
print(f"\nInvoice to pay:\n{challenge['invoice']}\n")
preimage = input("Preimage (hex): ").strip()

# Step 3: Submit with proof
print("\nSubmitting with L402 proof...")
result = client.complete(challenge, preimage)

# Save the image
if isinstance(result, dict) and result.get("body"):
    data = result["body"]
    # Strip data URI prefix if present
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    img_bytes = base64.b64decode(data)
    with open("output.png", "wb") as f:
        f.write(img_bytes)
    print(f"Image saved to output.png ({len(img_bytes)} bytes)")
else:
    print(f"Response: {result}")
