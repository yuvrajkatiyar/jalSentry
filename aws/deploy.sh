#!/usr/bin/env bash
set -euo pipefail

# JalSentry AWS SAM Deployment Script (Bash)
STACK_NAME="${1:-jalsentry-stack}"
REGION="${2:-us-east-1}"

echo "==> Step 1: Building AWS Lambda bundle..."
npm run build:lambda

echo "==> Step 2: Deploying AWS SAM template..."
sam deploy \
  --template-file aws/template.yaml \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

echo "==> Deployment complete!"
