#!/bin/bash
# QA Environment Deployment Script for qa.jouster.org
# This script deploys the application to the QA environment

echo "========================================"
echo "JOUSTER QA DEPLOYMENT"
echo "========================================"

echo "[1/5] Building application for QA..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "[2/5] Creating QA S3 bucket if needed..."
if ! aws s3api head-bucket --bucket qa.jouster.org --region us-west-2 2>/dev/null; then
    echo "Creating QA S3 bucket..."
    aws s3 mb s3://qa.jouster.org --region us-west-2

    # Configure bucket for static website hosting
    aws s3 website s3://qa.jouster.org --index-document index.html --error-document index.html

    # Remove public access blocks
    aws s3api put-public-access-block \
        --bucket qa.jouster.org \
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    # Apply public read policy
    aws s3api put-bucket-policy \
        --bucket qa.jouster.org \
        --policy file://../policies/qa-bucket-policy.json

    echo "✅ QA S3 bucket created and configured"
else
    echo "QA S3 bucket already exists"
fi

echo "[3/5] Deploying application to QA S3 bucket..."
aws s3 sync dist/ s3://qa.jouster.org --delete --region us-west-2
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo "[4/5] Setting up QA DNS record..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text | sed 's|/hostedzone/||')

if [ -n "$HOSTED_ZONE_ID" ]; then
    echo "Checking DNS record for qa.jouster.org..."
    RECORD_EXISTS=$(aws route53 list-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --query "ResourceRecordSets[?Name=='qa.jouster.org.' && Type=='CNAME']" \
        --output text)

    if [ -z "$RECORD_EXISTS" ]; then
        echo "Creating DNS record for qa.jouster.org..."
        aws route53 change-resource-record-sets \
            --hosted-zone-id $HOSTED_ZONE_ID \
            --change-batch file://../configs/qa-dns-record.json
        echo "✅ DNS record created for qa.jouster.org"
    else
        echo "DNS record for qa.jouster.org already exists"
    fi
else
    echo "⚠️ No hosted zone found for jouster.org - QA accessible via S3 endpoint only"
fi

echo "[5/5] Deployment complete!"
echo
echo "========================================"
echo "QA DEPLOYMENT COMPLETE"
echo "========================================"
echo "QA Environment URLs:"
echo "- Custom Domain: https://qa.jouster.org"
echo "- S3 Direct: http://qa.jouster.org.s3-website-us-west-2.amazonaws.com"
echo
echo "Build deployed from develop branch"
echo "Timestamp: $(date)"
echo
