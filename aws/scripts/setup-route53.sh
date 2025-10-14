#!/bin/bash
# Route 53 Setup Script for jouster.org
# This script sets up Route 53 hosted zone and CloudFront distribution

echo "========================================"
echo "JOUSTER.ORG - ROUTE 53 SETUP"
echo "========================================"

# Step 1: Create hosted zone for jouster.org
echo "[1/6] Creating Route 53 hosted zone for jouster.org..."
HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
    --name jouster.org \
    --caller-reference "jouster-$(date +%s)" \
    --hosted-zone-config Comment="Jouster.org main domain" \
    --query 'HostedZone.Id' \
    --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Hosted zone created: $HOSTED_ZONE_ID"
else
    echo "ℹ️  Hosted zone may already exist, checking..."
    HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
        --query "HostedZones[?Name=='jouster.org.'].Id" \
        --output text)
    echo "Found existing hosted zone: $HOSTED_ZONE_ID"
fi

# Step 2: Get nameservers for domain registrar
echo "[2/6] Getting nameservers for domain registrar..."
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID \
    --query 'DelegationSet.NameServers' \
    --output table

echo ""
echo "📋 IMPORTANT: Update your domain registrar with these nameservers!"
echo ""

# Step 3: Request SSL certificate
echo "[3/6] Requesting SSL certificate for jouster.org..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name jouster.org \
    --subject-alternative-names "www.jouster.org" \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)

echo "✅ Certificate requested: $CERT_ARN"
echo "ℹ️  You'll need to validate the certificate via DNS records"

# Step 4: Get DNS validation records
echo "[4/6] Getting DNS validation records..."
sleep 10  # Wait for certificate request to propagate
aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region us-east-1 \
    --query 'Certificate.DomainValidationOptions' \
    --output table

echo ""
echo "📋 Add these DNS validation records to Route 53!"
echo ""

# Step 5: Create CloudFront distribution configuration
echo "[5/6] Creating CloudFront distribution configuration..."
cat > cloudfront-config.json << EOF
{
    "CallerReference": "jouster-cf-$(date +%s)",
    "Comment": "Jouster.org CloudFront Distribution",
    "DefaultCacheBehavior": {
        "TargetOriginId": "jouster-s3-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        }
    },
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "jouster-s3-origin",
                "DomainName": "jouster-org-static.s3-website-us-east-1.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "Enabled": true,
    "Aliases": {
        "Quantity": 2,
        "Items": ["jouster.org", "www.jouster.org"]
    },
    "ViewerCertificate": {
        "ACMCertificateArn": "$CERT_ARN",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "DefaultRootObject": "index.html",
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200"
            }
        ]
    }
}
EOF

echo "✅ CloudFront configuration created"

echo ""
echo "========================================"
echo "NEXT STEPS:"
echo "========================================"
echo "1. Add Route 53 permissions to your IAM user"
echo "2. Update domain registrar with the nameservers shown above"
echo "3. Add DNS validation records for SSL certificate"
echo "4. Wait for certificate validation (can take 5-30 minutes)"
echo "5. Run: ./setup-cloudfront.sh (after certificate is validated)"
echo ""
