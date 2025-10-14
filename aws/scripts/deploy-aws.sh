#!/bin/bash

# Jouster.org AWS Deployment Script
# This script deploys the Jouster application to AWS S3 + CloudFront

set -e

echo "🚀 Starting Jouster.org deployment to AWS..."

# Configuration
DOMAIN="jouster.org"
S3_BUCKET="jouster-org-static"
CLOUDFRONT_DISTRIBUTION_ID=""  # Will be set after CloudFormation deployment
REGION="us-east-1"
BUILD_DIR="dist/jouster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi
print_status "AWS CLI found"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi
print_status "Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm first."
    exit 1
fi
print_status "npm found: $(npm --version)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
print_status "AWS credentials configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false
print_status "Dependencies installed"

# Build the application for production
echo "🏗️  Building application for production..."
npm run build
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed. Directory $BUILD_DIR not found."
    exit 1
fi
print_status "Application built successfully"

# Deploy infrastructure (CloudFormation)
echo "☁️  Deploying AWS infrastructure..."
aws cloudformation deploy \
    --template-file aws-infrastructure.yml \
    --stack-name jouster-org-infrastructure \
    --parameter-overrides DomainName=$DOMAIN \
    --capabilities CAPABILITY_IAM \
    --region $REGION

if [ $? -eq 0 ]; then
    print_status "Infrastructure deployed successfully"
else
    print_error "Infrastructure deployment failed"
    exit 1
fi

# Get CloudFront Distribution ID
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name jouster-org-infrastructure \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

print_status "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"

# Sync files to S3
echo "📁 Syncing files to S3..."
aws s3 sync $BUILD_DIR s3://$S3_BUCKET --delete --region $REGION

# Set cache headers for different file types
echo "🔧 Setting cache headers..."

# HTML files - short cache (1 day)
aws s3 cp s3://$S3_BUCKET/ s3://$S3_BUCKET/ --recursive \
    --exclude "*" --include "*.html" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=86400" \
    --region $REGION

# JS/CSS files - long cache (1 year) since they're hashed
aws s3 cp s3://$S3_BUCKET/ s3://$S3_BUCKET/ --recursive \
    --exclude "*" --include "*.js" --include "*.css" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable" \
    --region $REGION

# Static assets - long cache (1 year)
aws s3 cp s3://$S3_BUCKET/ s3://$S3_BUCKET/ --recursive \
    --exclude "*" --include "*.png" --include "*.jpg" --include "*.ico" --include "*.svg" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000" \
    --region $REGION

print_status "Files synced to S3 with optimized cache headers"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*" \
    --region $REGION

print_status "CloudFront cache invalidated"

# Get the CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name jouster-org-infrastructure \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
print_status "Your application is now live at:"
echo "   📍 https://$DOMAIN"
echo "   📍 https://$CLOUDFRONT_DOMAIN (CloudFront direct)"
echo ""
print_status "Flash Experiments with 56+ presets are ready!"
print_warning "DNS propagation may take up to 48 hours for the custom domain."
echo ""
