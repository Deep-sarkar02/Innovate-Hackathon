"""Test Ministral on Amazon Bedrock via OpenAI Chat Completions."""

import os
import sys
from pathlib import Path

from openai import OpenAI

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

REGION = os.environ.get("AWS_REGION", "us-west-2")
MODEL = os.environ.get("BEDROCK_MODEL", "mistral.ministral-3-8b-instruct")
api_key = os.environ.get("BEDROCK_API_KEY") or os.environ.get("AWS_BEARER_TOKEN_BEDROCK")

if not api_key:
    raise SystemExit("Set BEDROCK_API_KEY in .env before running this script.")

client = OpenAI(
    api_key=api_key,
    base_url=f"https://bedrock-mantle.{REGION}.api.aws/v1",
)

response = client.chat.completions.create(
    model=MODEL,
    messages=[
        {
            "role": "system",
            "content": "You are a skeptical father evaluating NEET coaching for your child.",
        },
        {
            "role": "user",
            "content": "Tell me about Infinity Learn pricing and scholarships.",
        },
    ],
    max_tokens=256,
)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

print(response.choices[0].message.content)
