#!/usr/bin/env bash
set -euo pipefail
REGION="${AWS_REGION:-us-east-1}"

create() {
  aws dynamodb create-table --region "$REGION" --table-name "$1" \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST 2>/dev/null \
    && echo "Created $1" || echo "$1 already exists"
}

# jmi-cache uses a single partition key
aws dynamodb create-table --region "$REGION" --table-name jmi-cache \
  --attribute-definitions AttributeName=cacheKey,AttributeType=S \
  --key-schema AttributeName=cacheKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST 2>/dev/null \
  && echo "Created jmi-cache" || echo "jmi-cache already exists"

aws dynamodb update-time-to-live --region "$REGION" \
  --table-name jmi-cache \
  --time-to-live-specification "Enabled=true,AttributeName=ttl" 2>/dev/null || true

create jmi-events

aws dynamodb update-time-to-live --region "$REGION" \
  --table-name jmi-events \
  --time-to-live-specification "Enabled=true,AttributeName=ttl" 2>/dev/null || true

echo "✓ Tables ready."
