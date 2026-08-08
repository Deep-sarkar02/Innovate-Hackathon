"""List models on Amazon Bedrock via the OpenAI-compatible bedrock-mantle endpoint."""

import os

from openai import OpenAI

# Token region must match the endpoint region (decode your key to confirm).
REGION = os.environ.get("AWS_REGION", "us-west-2")
BASE_URL = f"https://bedrock-mantle.{REGION}.api.aws/v1"

api_key = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
if not api_key:
    raise SystemExit("Set AWS_BEARER_TOKEN_BEDROCK before running this script.")

client = OpenAI(api_key=api_key, base_url=BASE_URL)

models = client.models.list()

for model in models.data:
    print(model.id)
