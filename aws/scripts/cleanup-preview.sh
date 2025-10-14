#!/bin/bash
# Preview Environment Cleanup Script
# This script removes the preview environment when a PR is closed/merged

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
    echo "ℹ️  Bucket $BUCKET_NAME does not exist or already cleaned up"
    exit 0
fi

echo "[1/3] Removing all objects from bucket..."
aws s3 rm "s3://$BUCKET_NAME" --recursive

echo "[2/3] Removing bucket versioning (if enabled)..."
# Delete all versions and delete markers if versioning is enabled
aws s3api list-object-versions --bucket "$BUCKET_NAME" --output json | \
    jq -r '.Versions[]?, .DeleteMarkers[]? | "\(.Key) \(.VersionId)"' | \
    while read -r key version_id; do
        if [ -n "$key" ] && [ -n "$version_id" ]; then
            aws s3api delete-object --bucket "$BUCKET_NAME" --key "$key" --version-id "$version_id" || true
        fi
    done 2>/dev/null || true

echo "[3/3] Deleting S3 bucket..."
aws s3 rb "s3://$BUCKET_NAME" --force

echo ""
echo "🧹 Preview environment cleanup completed!"
echo ""
echo "✅ Removed:"
echo "   • S3 Bucket: $BUCKET_NAME"
echo "   • All associated objects and versions"
echo "   • Bucket policies and configurations"
echo ""
