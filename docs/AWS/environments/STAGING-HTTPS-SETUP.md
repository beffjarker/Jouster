# Staging HTTPS Setup - In Progress

**Date**: 2025-11-13  
**Status**: ⏳ **Certificate Validation in Progress**

---

## 🎯 Objective

Set up HTTPS for the staging environment (stg.jouster.org) using CloudFront and ACM certificate.

---

## ✅ Completed Steps

### 1. ✅ Requested Wildcard SSL Certificate
- **Certificate ARN**: `arn:aws:acm:us-east-1:924677642513:certificate/305caa8a-8b31-4cc5-bd61-0d048d841cb8`
- **Domain**: `*.jouster.org`
- **Subject Alternative Names**: `jouster.org`
- **Region**: us-east-1 (required for CloudFront)
- **Validation Method**: DNS

### 2. ✅ Added DNS Validation Record
- **Record Name**: `_7855824fef3767dfba2fee1397007f41.jouster.org.`
- **Record Type**: CNAME
- **Record Value**: `_aef801e4a7f554da86a9c5ae6c27c0b9.xlfgrmvvlj.acm-validations.aws.`
- **Status**: PENDING (added to Route53)

---

## ⏳ Next Steps

### 3. Wait for Certificate Validation
- **Estimated Time**: 5-30 minutes
- **Status Check**: `aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:924677642513:certificate/305caa8a-8b31-4cc5-bd61-0d048d841cb8 --region us-east-1 --query "Certificate.Status"`
- **Expected Status**: "ISSUED"

### 4. Create CloudFront Distribution for Staging
Once certificate is validated:
- **Origin**: `stg.jouster.org.s3-website-us-west-2.amazonaws.com`
- **Aliases**: `stg.jouster.org`
- **SSL Certificate**: Use the new wildcard certificate
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Default Root Object**: `index.html`

### 5. Update Route53 DNS
- **Record Name**: `stg.jouster.org`
- **Record Type**: A (Alias)
- **Target**: CloudFront distribution domain name
- **Routing Policy**: Simple

### 6. Invalidate CloudFront Cache
- Invalidate all paths (`/*`) to ensure fresh deployment

---

## 📋 Configuration Details

### S3 Bucket (Origin)
- **Bucket Name**: `stg.jouster.org`
- **Region**: us-west-2
- **Website Hosting**: Enabled
- **Index Document**: index.html
- **Error Document**: index.html

### ACM Certificate
- **Wildcard**: Covers all subdomains of jouster.org
- **Benefits**: 
  - Can be reused for qa.jouster.org (if needed)
  - Can be reused for any future subdomains
  - Single certificate management

### CloudFront Configuration
```json
{
  "Comment": "Staging Environment - stg.jouster.org",
  "Origins": [{
    "Id": "stg-s3-origin",
    "DomainName": "stg.jouster.org.s3-website-us-west-2.amazonaws.com",
    "CustomOriginConfig": {
      "HTTPPort": 80,
      "HTTPSPort": 443,
      "OriginProtocolPolicy": "http-only"
    }
  }],
  "DefaultRootObject": "index.html",
  "Aliases": ["stg.jouster.org"],
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:924677642513:certificate/305caa8a-8b31-4cc5-bd61-0d048d841cb8",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "ViewerProtocolPolicy": "redirect-to-https",
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": "200",
    "ResponsePagePath": "/index.html"
  }]
}
```

---

## 🔍 Monitoring

**Check Certificate Status**:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:924677642513:certificate/305caa8a-8b31-4cc5-bd61-0d048d841cb8 \
  --region us-east-1 \
  --query "Certificate.{Status:Status,DomainValidationOptions:DomainValidationOptions[*].ValidationStatus}"
```

**Check DNS Propagation**:
```bash
nslookup _7855824fef3767dfba2fee1397007f41.jouster.org
```

---

## 📊 Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| Certificate Request | Instant | ✅ Complete |
| DNS Record Creation | 1-2 min | ✅ Complete |
| Certificate Validation | 5-30 min | ⏳ In Progress |
| CloudFront Creation | 5-10 min | ⏳ Pending |
| DNS Update | 1-2 min | ⏳ Pending |
| CloudFront Deployment | 15-20 min | ⏳ Pending |
| **Total Estimated Time** | **30-60 min** | - |

---

## ✅ Post-Deployment Verification

Once complete, verify:
- [ ] https://stg.jouster.org loads successfully
- [ ] HTTP automatically redirects to HTTPS
- [ ] SSL certificate is valid (no browser warnings)
- [ ] Version logging shows correct version
- [ ] All features work normally

---

## 🔄 Rollback Plan

If issues occur:
1. Remove stg.jouster.org alias from CloudFront
2. Point stg.jouster.org back to S3 website endpoint (HTTP only)
3. Keep CloudFront distribution for future retry

---

**Next Action**: Wait for certificate validation, then proceed with CloudFront creation.

**Document Version**: 1.0  
**Last Updated**: 2025-11-13 by GitHub Copilot

