#!/bin/bash
# Preview Environment Cleanup Script
# This script removes a preview environment S3 bucket and its contents

set -e

BUCKET_NAME="$1"

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Usage: $0 <bucket-name>"
    exit 1
fi

echo "========================================"
echo "JOUSTER PREVIEW CLEANUP"
echo "========================================"
echo "📦 Bucket: $BUCKET_NAME"
echo "🌍 Region: us-west-2"
echo "========================================"

# Check if bucket exists
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" --region us-west-2 2>/dev/null; then
    echo "✅ Bucket $BUCKET_NAME does not exist (already deleted)"
    exit 0
fi

echo "[1/2] Deleting all objects in bucket..."
aws s3 rm "s3://$BUCKET_NAME" --recursive --region us-west-2

echo "[2/2] Deleting bucket..."
aws s3api delete-bucket --bucket "$BUCKET_NAME" --region us-west-2

echo ""
echo "🎉 Preview environment cleaned up successfully!"
echo ""

