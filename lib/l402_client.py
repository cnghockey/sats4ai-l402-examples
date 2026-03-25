"""
Minimal L402 client for Sats4AI.

Handles the 3-step L402 flow:
  1. POST request → 402 with macaroon + invoice
  2. Pay invoice externally
  3. Retry with Authorization: L402 <macaroon>:<preimage>

Usage:
    from lib.l402_client import L402Client

    client = L402Client()
    challenge = client.request("generate-image", {"input": {"prompt": "a cat"}})
    # pay challenge["invoice"] with your wallet, get preimage
    result = client.complete(challenge, preimage="abc123...")
"""

import re
import requests

BASE_URL = "https://sats4ai.com/api/l402"


class L402Client:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")

    def request(self, service: str, body: dict) -> dict:
        """
        Step 1: Send request, expect 402, extract macaroon + invoice.

        Returns dict with keys: macaroon, invoice, service, body
        """
        url = f"{self.base_url}/{service}"
        resp = requests.post(url, json=body)

        if resp.status_code == 200:
            return {"already_paid": True, "result": resp.json()}

        if resp.status_code != 402:
            raise L402Error(f"Expected 402, got {resp.status_code}: {resp.text}")

        www_auth = resp.headers.get("www-authenticate", "")
        macaroon = _extract(r'macaroon="([^"]+)"', www_auth)
        invoice = _extract(r'invoice="([^"]+)"', www_auth)

        if not macaroon or not invoice:
            raise L402Error(f"Missing macaroon or invoice in www-authenticate header")

        return {
            "macaroon": macaroon,
            "invoice": invoice,
            "service": service,
            "body": body,
        }

    def complete(self, challenge: dict, preimage: str) -> dict:
        """
        Step 3: Resend original request with L402 authorization.

        Args:
            challenge: dict returned by request()
            preimage: hex-encoded preimage from Lightning payment
        """
        if challenge.get("already_paid"):
            return challenge["result"]

        url = f"{self.base_url}/{challenge['service']}"
        auth = f"L402 {challenge['macaroon']}:{preimage}"

        resp = requests.post(
            url,
            json=challenge["body"],
            headers={"Authorization": auth},
        )

        if resp.status_code not in (200, 202):
            raise L402Error(f"L402 auth failed ({resp.status_code}): {resp.text}")

        return resp.json()

    def get_models(self) -> dict:
        """Fetch available models and pricing (free, no auth)."""
        resp = requests.get(f"{self.base_url}/models")
        resp.raise_for_status()
        return resp.json()

    def poll_job(self, request_id: str, job_type: str) -> dict:
        """Poll an async job status (free, no auth)."""
        resp = requests.get(
            f"{self.base_url}/job-status",
            params={"requestId": request_id, "jobType": job_type},
        )
        resp.raise_for_status()
        return resp.json()


class L402Error(Exception):
    pass


def _extract(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(1) if match else None
