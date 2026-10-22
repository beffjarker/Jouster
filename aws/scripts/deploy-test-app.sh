#!/bin/bash
set -euo pipefail

# Deploy apps/hello-test to S3 static hosting
# Usage: deploy-test-app.sh [BRANCH]

# Get branch name (default: current git branch)
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

# Sanitize branch name: lowercase, only a-z0-9-, other chars become -
BRANCH_SANITIZED=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

# Configuration (env-overridable)
BUCKET="${BUCKET:-test.jouster.org}"
REGION="${REGION:-us-west-2}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-Z000159514WV2RRYC18A5}"

echo "Deploying branch: $BRANCH_SANITIZED"
echo "Bucket: $BUCKET"
echo "Region: $REGION"

# Check if bucket exists
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "Bucket does not exist, creating..."
    
    # Create bucket in us-west-2
    aws s3api create-bucket \
        --bucket "$BUCKET" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    # Disable public access block (all four false)
    aws s3api put-public-access-block \
        --bucket "$BUCKET" \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
    
    # Configure static website hosting
    aws s3api put-bucket-website \
        --bucket "$BUCKET" \
        --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
    
    # Set bucket policy for public read
    aws s3api put-bucket-policy \
        --bucket "$BUCKET" \
        --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicReadGetObject\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${BUCKET}/*\"}]}"
    
    echo "Bucket created and configured for static website hosting"
fi

# UPSERT Route53 CNAME record
echo "Updating Route53 CNAME record..."
CHANGE_BATCH=$(cat <<EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "${BUCKET}",
            "Type": "CNAME",
            "TTL": 300,
            "ResourceRecords": [{"Value": "${BUCKET}.s3-website-${REGION}.amazonaws.com"}]
        }
    }]
}
EOF
)

aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "$CHANGE_BATCH"

# Create temp directory and copy app files
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

cp -r apps/hello-test/* "$TMPDIR/"

# Overwrite config.js with branch info
echo "window.JOUSTER_BRANCH = '${BRANCH_SANITIZED}';" > "$TMPDIR/config.js"

# Sync to S3
echo "Syncing to S3..."
aws s3 sync "$TMPDIR" "s3://${BUCKET}/${BRANCH_SANITIZED}/" \
    --delete \
    --cache-control "max-age=60"

echo ""
echo "Deployed successfully!"
echo "URL: http://${BUCKET}/${BRANCH_SANITIZED}/"
