#!/usr/bin/env bash
# Create the three DynamoDB tables for FinTrack.
# Run once before first deploy: AWS_REGION=us-east-1 ./scripts/create-tables.sh
set -euo pipefail
REGION="${AWS_REGION:-us-east-1}"
log() { echo "[dynamo] $*"; }

create() {
  local name="$1" pk="$2" sk="$3"
  aws dynamodb create-table \
    --region "$REGION" --table-name "$name" \
    --attribute-definitions "AttributeName=$pk,AttributeType=S" "AttributeName=$sk,AttributeType=S" \
    --key-schema "AttributeName=$pk,KeyType=HASH" "AttributeName=$sk,KeyType=RANGE" \
    --billing-mode PAY_PER_REQUEST \
    2>/dev/null && log "Created $name" || log "$name already exists"
}

create ft-transactions PK SK
create ft-accounts     PK SK
create ft-events       PK SK

# Enable TTL on events table
aws dynamodb update-time-to-live --region "$REGION" \
  --table-name ft-events \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  2>/dev/null && log "TTL enabled on ft-events" || log "TTL already set"

log "✓ Done."
