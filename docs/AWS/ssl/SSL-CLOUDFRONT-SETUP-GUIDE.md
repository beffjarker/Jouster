# SSL & CloudFront Setup Guide for Jouster.org

**Last Updated**: November 10, 2025  
**Status**: SSL Certificate ✅ ISSUED | CloudFront ❌ Not Created | DNS ❌ Not Configured

---

## 📋 Overview

This guide walks through setting up HTTPS for jouster.org using:
- ✅ **AWS Certificate Manager (ACM)** - FREE SSL certificate (already issued!)
- 🔄 **CloudFront CDN** - Global content delivery with HTTPS
- 🔄 **Route 53 DNS** - Custom domain routing

---

## ✅ Current Status

### SSL Certificate (COMPLETED)
- **ARN**: `arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617`
- **Status**: ✅ **ISSUED**
- **Certificate Region**: us-east-1 (AWS requires CloudFront certificates in us-east-1)
- **Resource Region**: us-west-2 (S3, DynamoDB, other resources)
- **Domains**: 
  - jouster.org
  - www.jouster.org
- **Valid Until**: November 4, 2026
- **Validation**: DNS validation completed
- **Ready to Use**: YES

### CloudFront Distribution (PENDING)
- **Status**: ❌ Not yet created
- **Next Action**: Run `setup-ssl-cloudfront.bat`

### Route 53 DNS (PENDING)
- **Status**: ❌ Not yet configured
- **Next Action**: Run after CloudFront is deployed

---

## 🚀 Step-by-Step Setup

### Step 1: Create CloudFront Distribution

**Estimated Time**: 20-30 minutes (15-20 for CloudFront deployment)

```cmd
cd H:\projects\Jouster\aws\scripts
.\setup-ssl-cloudfront.bat
```

**What this does**:
1. Verifies SSL certificate is ISSUED ✅
2. Creates CloudFront distribution configuration
3. Deploys CloudFront with:
   - Origin: S3 bucket `jouster-org-static`
   - SSL Certificate: Your ACM certificate
   - Custom domains: jouster.org, www.jouster.org
   - HTTPS redirect enabled
   - SPA routing (404 → index.html)
4. Saves distribution info to `tmp\cloudfront-production-info.txt`

**Expected Output**:
```
✅ CloudFront distribution created!
   Distribution ID: E1234567ABCDEF
   CloudFront Domain: d1abc234xyz.cloudfront.net
```

**Important**: CloudFront takes 15-20 minutes to deploy globally. Don't proceed to Step 2 until status is "Deployed".

---

### Step 2: Verify CloudFront Deployment

**Check deployment status** (repeat until "Deployed"):

```cmd
aws cloudfront get-distribution --id E1234567ABCDEF --query "Distribution.Status" --output text
```

Expected: `Deployed`

**Test CloudFront URL** (after deployment completes):

```cmd
# In browser, navigate to:
https://d1abc234xyz.cloudfront.net
```

You should see your Jouster.org site with HTTPS! 🎉

---

### Step 3: Configure Route 53 DNS

**Estimated Time**: 10 minutes + DNS propagation (5-60 minutes)

```cmd
cd H:\projects\Jouster\aws\scripts
.\setup-route53-dns.bat E1234567ABCDEF d1abc234xyz.cloudfront.net
```

**What this does**:
1. Creates Route 53 hosted zone for jouster.org (if doesn't exist)
2. Gets nameservers for domain registrar
3. Creates DNS A records:
   - jouster.org → CloudFront
   - www.jouster.org → CloudFront
4. Displays nameservers for registrar update

**Important**: Save the nameservers displayed! You'll need them for Step 4.

---

### Step 4: Update Domain Registrar

**Where you registered jouster.org** (e.g., Namecheap, GoDaddy, Google Domains):

1. Log in to your domain registrar
2. Navigate to DNS/Nameserver settings for jouster.org
3. Update nameservers to the 4 Route 53 nameservers from Step 3:
   ```
   ns-1234.awsdns-12.org
   ns-5678.awsdns-34.com
   ns-9012.awsdns-56.net
   ns-3456.awsdns-78.co.uk
   ```
4. Save changes

**DNS Propagation**: 5-60 minutes (typically 15-30 minutes)

---

### Step 5: Test HTTPS

**After DNS propagates**, test your site:

```cmd
# Command line
nslookup jouster.org
ping jouster.org

# Browser
https://jouster.org
https://www.jouster.org
```

**Verify**:
- ✅ Browser shows padlock icon (HTTPS)
- ✅ Certificate issued to jouster.org
- ✅ Site loads correctly
- ✅ No mixed content warnings

---

## 🔧 Troubleshooting

### CloudFront Distribution Creation Failed
- Certificate must be in `us-east-1` region ✅ (already is - AWS requirement for CloudFront)
- S3 buckets and other resources are in `us-west-2` (this is correct)
**Error**: "ACMCertificateArn is invalid"
- Certificate must be in `us-east-1` region ✅ (already is)
- Certificate status must be "ISSUED" ✅ (already is)
- Check certificate ARN is correct ✅ (verified above)

**Error**: "Aliases already exist in another distribution"
- Delete old CloudFront distribution using jouster.org alias
- Or remove aliases from old distribution

**Solution**:
```cmd
# List all distributions
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,Aliases.Items]" --output table

# If old distribution exists with jouster.org alias, get its config and remove aliases
```

### DNS Not Resolving

**Issue**: `nslookup jouster.org` returns NXDOMAIN

**Causes**:
1. Nameservers not updated at registrar → Update nameservers
2. DNS propagation in progress → Wait 15-30 more minutes
3. Route 53 records not created → Re-run `setup-route53-dns.bat`

**Check nameservers**:
```cmd
nslookup -type=NS jouster.org
```

Should return Route 53 nameservers (ns-*.awsdns-*.*)

### SSL Certificate Issues

**Issue**: Browser shows "Not Secure" or certificate error

**Causes**:
1. DNS pointing to wrong location → Verify A records in Route 53
2. CloudFront using wrong certificate → Check distribution config
3. Mixed content (HTTP resources on HTTPS page) → Check browser console

**Verify certificate in CloudFront**:
```cmd
aws cloudfront get-distribution --id E1234567ABCDEF --query "Distribution.DistributionConfig.ViewerCertificate"
```

Should show your ACM certificate ARN.

---

## 📊 Cost Estimate

### AWS Certificate Manager (ACM)
- **Cost**: FREE ✅
- **Renewal**: Automatic (no action needed)

### CloudFront
- **Data Transfer**: $0.085/GB (first 10 TB)
- **Requests**: $0.0075 per 10,000 HTTPS requests
- **Estimated**: ~$1-5/month for low-traffic site
- **Free Tier**: 1 TB transfer + 10M requests/month (first 12 months)

### Route 53
- **Hosted Zone**: $0.50/month
- **Queries**: $0.40 per million (first 1 billion)
- **Estimated**: ~$0.50-1.00/month

**Total Estimated**: $1.50-6.00/month

---

## 🎯 Post-Setup Tasks

### Update Deployment Scripts

After CloudFront is set up, update your deployment workflow:

1. **Build application**: `npm run build`
2. **Upload to S3**: `aws s3 sync dist/jouster-ui s3://jouster-org-static/`
3. **Invalidate CloudFront cache**:
   ```cmd
   aws cloudfront create-invalidation --distribution-id E1234567ABCDEF --paths "/*"
   ```

### Create Deployment Script

Create `deploy-to-cloudfront.bat`:
```bat
@echo off
echo Building Jouster.org...
call npm run build

echo Uploading to S3...
aws s3 sync dist\jouster-ui s3://jouster-org-static\ --delete

echo Invalidating CloudFront cache...
aws cloudfront create-invalidation --distribution-id E1234567ABCDEF --paths "/*"

echo ✅ Deployment complete!
echo Visit: https://jouster.org
pause
```

### Enable CloudFront Logging (Optional)

Track visitor analytics:
```cmd
aws cloudfront update-distribution --id E1234567ABCDEF --logging-config Enabled=true,Bucket=jouster-logs.s3.amazonaws.com,Prefix=cloudfront/
```

### Set Up Monitoring (Optional)

Monitor site health with CloudWatch:
- 4xx/5xx error rates
- Cache hit ratio
- Request counts
- Data transfer

---

## 📝 Quick Reference

### Check Certificate Status
Note: ACM certificates for CloudFront must be in us-east-1, even if other resources are in us-west-2.
```cmd
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617 --region us-east-1 --query "Certificate.Status"
```

### Check CloudFront Status
```cmd
aws cloudfront get-distribution --id E1234567ABCDEF --query "Distribution.Status"
```

### Check DNS Records
```cmd
aws route53 list-resource-record-sets --hosted-zone-id Z1234567ABCDEF --query "ResourceRecordSets[?Name=='jouster.org.']"
```

### Invalidate CloudFront Cache
```cmd
aws cloudfront create-invalidation --distribution-id E1234567ABCDEF --paths "/*"
```

### Test DNS Propagation
```cmd
nslookup jouster.org
nslookup jouster.org 8.8.8.8
```

---

## 🔐 Security Best Practices

1. ✅ **SSL/TLS**: Force HTTPS (already configured)
2. ✅ **TLS Version**: Minimum TLSv1.2 (already configured)
3. 🔄 **Security Headers**: Add via Lambda@Edge or CloudFront Functions
4. 🔄 **WAF**: Consider AWS WAF for DDoS protection
5. ✅ **Certificate Renewal**: Automatic with ACM

---

## 📚 Additional Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/) - Test your SSL configuration

---

## ✅ Success Criteria

You'll know setup is complete when:

- [ ] CloudFront distribution status is "Deployed"
- [ ] `https://[cloudfront-domain].cloudfront.net` loads your site
- [ ] Route 53 hosted zone created
- [ ] Nameservers updated at domain registrar
- [ ] `nslookup jouster.org` resolves to CloudFront
- [ ] `https://jouster.org` loads with green padlock
- [ ] `https://www.jouster.org` redirects correctly
- [ ] No SSL warnings in browser

---

**Need Help?** Check the Troubleshooting section above or review AWS CloudFront/Route 53 documentation.

