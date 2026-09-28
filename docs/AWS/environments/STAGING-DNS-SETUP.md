# Staging DNS Setup - stg.jouster.org

**Date**: November 11, 2025  
**Time**: ~10:30 PM  
**Status**: ⏳ **DNS CONFIGURATION NEEDED**

---

## ✅ Current Status

### What's Working:

**S3 Website Endpoint**: ✅ **WORKING**
- URL: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com
- Status: Application loads correctly
- Features: Auth-based navigation with 3 public items
- Performance: Good

### What's Missing:

**Custom Domain**: ⏳ **NOT CONFIGURED**
- Desired URL: https://stg.jouster.org
- Current Status: DNS record not set up
- Required: Route53 CNAME record

---

## 🔧 DNS Setup Options

### Option 1: Simple CNAME to S3 (HTTP Only)

This creates a CNAME record pointing stg.jouster.org to the S3 website endpoint.

**Pros**:
- Simple setup
- No additional AWS resources needed
- Works immediately

**Cons**:
- HTTP only (no HTTPS)
- S3 website endpoints don't support HTTPS

**Steps**:
```cmd
REM Get the hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text > tmp\zone-id.txt
set /p ZONE_ID=<tmp\zone-id.txt
set ZONE_ID=%ZONE_ID:/hostedzone/=%

REM Create CNAME record
aws route53 change-resource-record-sets --hosted-zone-id %ZONE_ID% --change-batch "{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"stg.jouster.org\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"stg.jouster.org.s3-website-us-west-2.amazonaws.com\"}]}}]}"
```

**Result**: http://stg.jouster.org will work (not HTTPS)

### Option 2: CloudFront Distribution (HTTPS Supported)

This creates a CloudFront distribution in front of the S3 bucket with SSL certificate.

**Pros**:
- HTTPS support
- Better performance (CDN)
- Custom domain works
- Matches production setup

**Cons**:
- More complex setup
- Requires SSL certificate
- Takes 10-15 minutes to deploy

**Steps**:

1. **Create CloudFront distribution**:
```cmd
REM Create distribution config file
echo { > tmp\staging-cf-config.json
echo   "CallerReference": "staging-%date:~-4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%", >> tmp\staging-cf-config.json
echo   "Origins": { >> tmp\staging-cf-config.json
echo     "Quantity": 1, >> tmp\staging-cf-config.json
echo     "Items": [{ >> tmp\staging-cf-config.json
echo       "Id": "S3-stg-jouster", >> tmp\staging-cf-config.json
echo       "DomainName": "stg.jouster.org.s3-website-us-west-2.amazonaws.com", >> tmp\staging-cf-config.json
echo       "CustomOriginConfig": { >> tmp\staging-cf-config.json
echo         "HTTPPort": 80, >> tmp\staging-cf-config.json
echo         "OriginProtocolPolicy": "http-only" >> tmp\staging-cf-config.json
echo       } >> tmp\staging-cf-config.json
echo     }] >> tmp\staging-cf-config.json
echo   }, >> tmp\staging-cf-config.json
echo   "DefaultRootObject": "index.html", >> tmp\staging-cf-config.json
echo   "Enabled": true >> tmp\staging-cf-config.json
echo } >> tmp\staging-cf-config.json

REM Create distribution
aws cloudfront create-distribution --distribution-config file://tmp/staging-cf-config.json
```

2. **Request SSL certificate** (if not already exists):
```cmd
aws acm request-certificate --domain-name stg.jouster.org --validation-method DNS --region us-east-1
```

3. **Create Route53 alias record**:
```cmd
REM After CloudFront distribution is created
aws route53 change-resource-record-sets --hosted-zone-id %ZONE_ID% --change-batch file://tmp/staging-dns-alias.json
```

### Option 3: Use Existing Production CloudFront (Quickest)

If production CloudFront already exists for jouster.org, we can add stg.jouster.org as an alternate domain.

**Pros**:
- Quick setup
- Uses existing infrastructure
- HTTPS already configured

**Cons**:
- Staging and production share CloudFront distribution
- Need to add stg.jouster.org to certificate

---

## 🎯 Recommended Approach

### For Now: Option 1 (CNAME to S3 - HTTP)

**Why**:
- Quick and simple
- Gets stg.jouster.org working immediately
- Good for internal testing
- Can upgrade to CloudFront later

**Steps to Execute**:

1. **Get Route53 Hosted Zone ID**:
```cmd
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text
```

Save the output (looks like: `/hostedzone/Z1234567890ABC`)

2. **Create DNS Record**:
```cmd
REM Replace ZONE_ID with the ID from step 1 (without /hostedzone/ prefix)
aws route53 change-resource-record-sets ^
  --hosted-zone-id Z1234567890ABC ^
  --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"stg.jouster.org\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"stg.jouster.org.s3-website-us-west-2.amazonaws.com\"}]}}]}"
```

3. **Wait for DNS Propagation** (5-10 minutes)

4. **Test**:
```cmd
REM Check DNS
nslookup stg.jouster.org

REM Test in browser
REM Visit: http://stg.jouster.org
```

### Later: Upgrade to CloudFront (Production Release)

When deploying to production, set up CloudFront for staging to match production infrastructure.

---

## 📋 Manual DNS Setup Instructions

If you need to set this up manually or verify the configuration:

### Step 1: Verify Route53 Hosted Zone Exists

1. Go to AWS Console → Route53 → Hosted Zones
2. Look for `jouster.org` hosted zone
3. Note the Hosted Zone ID (starts with Z...)

### Step 2: Create CNAME Record

1. Click on the `jouster.org` hosted zone
2. Click "Create record"
3. Fill in:
   - **Record name**: `stg`
   - **Record type**: `CNAME`
   - **Value**: `stg.jouster.org.s3-website-us-west-2.amazonaws.com`
   - **TTL**: `300` (5 minutes)
   - **Routing policy**: Simple routing
4. Click "Create records"

### Step 3: Wait and Test

1. Wait 5-10 minutes for DNS propagation
2. Test: `nslookup stg.jouster.org`
3. Should return: `stg.jouster.org.s3-website-us-west-2.amazonaws.com`
4. Visit: http://stg.jouster.org

---

## 🔍 Troubleshooting DNS

### DNS Not Resolving

```cmd
REM Check if record exists
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC --query "ResourceRecordSets[?Name=='stg.jouster.org.']"

REM Flush DNS cache locally
ipconfig /flushdns

REM Try different DNS server
nslookup stg.jouster.org 8.8.8.8
```

### CNAME Already Exists

```cmd
REM Use UPSERT instead of CREATE to update existing record
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"stg.jouster.org\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"stg.jouster.org.s3-website-us-west-2.amazonaws.com\"}]}}]}"
```

### Record Type Conflict

If an A record exists for stg.jouster.org, delete it first:
```cmd
REM List current records
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC --query "ResourceRecordSets[?Name=='stg.jouster.org.']"

REM Delete conflicting record (adjust Type and Value as needed)
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC --change-batch "{\"Changes\":[{\"Action\":\"DELETE\",\"ResourceRecordSet\":{\"Name\":\"stg.jouster.org\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"OLD_IP_ADDRESS\"}]}}]}"

REM Then create CNAME
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC --change-batch "{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"stg.jouster.org\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"stg.jouster.org.s3-website-us-west-2.amazonaws.com\"}]}}]}"
```

---

## ✅ Success Criteria

**DNS setup is successful when**:
- [ ] `nslookup stg.jouster.org` returns the S3 website endpoint
- [ ] `http://stg.jouster.org` loads the application
- [ ] Application functions correctly at custom domain
- [ ] DNS propagates globally (check with different DNS servers)

---

## 🎯 Current Situation

**What Works**:
- ✅ S3 bucket configured and public
- ✅ Application deployed to S3
- ✅ S3 website endpoint working: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com

**What's Needed**:
- ⏳ Route53 CNAME record creation
- ⏳ DNS propagation (5-10 minutes after creation)
- ⏳ Testing at http://stg.jouster.org

**Next Steps**:
1. Execute Option 1 DNS setup (CNAME to S3)
2. Wait for DNS propagation
3. Test stg.jouster.org
4. Continue with staging testing and approvals

---

## 📞 Quick Commands Reference

```cmd
REM List hosted zones
aws route53 list-hosted-zones

REM Get specific zone
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.']"

REM List records in zone
aws route53 list-resource-record-sets --hosted-zone-id ZONE_ID

REM Create CNAME record
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch FILE.json

REM Check DNS
nslookup stg.jouster.org

REM Check with Google DNS
nslookup stg.jouster.org 8.8.8.8

REM Flush local DNS cache
ipconfig /flushdns
```

---

**Status**: S3 deployment successful, DNS setup needed  
**Action Required**: Create Route53 CNAME record  
**Estimated Time**: 5-10 minutes (setup) + 5-10 minutes (propagation)  
**Priority**: Medium (S3 endpoint works for testing, custom domain nice-to-have)

---

*Created: November 11, 2025 at ~10:30 PM*  
*S3 Endpoint: Working ✅*  
*Custom Domain: Pending DNS setup ⏳*

