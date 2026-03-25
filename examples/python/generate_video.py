"""
Generate a video using Sats4AI L402 API (async service).

Usage:
    python generate_video.py "A robot dancing in Times Square"

Requires: pip install requests
"""

import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from lib.l402_client import L402Client

prompt = sys.argv[1] if len(sys.argv) > 1 else "A robot dancing in Times Square"

client = L402Client()

# Step 1: Request → 402
print(f"Requesting video: '{prompt}'")
challenge = client.request("generate-video", {
    "prompt": prompt,
    "duration": 5,
})

if challenge.get("already_paid"):
    result = challenge["result"]
else:
    # Step 2: Pay the invoice
    print(f"\nInvoice to pay:\n{challenge['invoice']}\n")
    preimage = input("Preimage (hex): ").strip()

    # Step 3: Submit with proof
    print("\nSubmitting with L402 proof...")
    result = client.complete(challenge, preimage)

# Handle async response
body = result.get("body", result)

if isinstance(body, dict) and body.get("requestId"):
    request_id = body["requestId"]
    job_type = "video"
    print(f"\nJob submitted: {request_id}")
    print("Polling for completion...")

    while True:
        time.sleep(5)
        status = client.poll_job(request_id, job_type)
        state = status.get("status", "unknown")
        print(f"  Status: {state}")

        if state == "COMPLETED":
            video_url = status.get("result", {}).get("url", "")
            print(f"\nVideo ready: {video_url}")
            break
        elif state == "FAILED":
            print(f"\nJob failed: {status}")
            break
else:
    print(f"Response: {body}")
