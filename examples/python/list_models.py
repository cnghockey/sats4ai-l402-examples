"""
List all available models and pricing (free, no auth required).

Usage:
    python list_models.py

Requires: pip install requests
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from lib.l402_client import L402Client

client = L402Client()
models = client.get_models()

if isinstance(models, list):
    print(f"{'ID':<5} {'Service':<20} {'Model':<30} {'Price'}")
    print("-" * 80)
    for m in models:
        model_id = m.get("id", "?")
        service = m.get("service") or m.get("type", "?")
        name = m.get("name") or m.get("model", "?")
        price = m.get("price") or m.get("pricing", "?")
        print(f"{model_id:<5} {service:<20} {name:<30} {price}")
else:
    print(models)
