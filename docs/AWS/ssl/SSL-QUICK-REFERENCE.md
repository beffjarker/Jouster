# SSL Setup Quick Reference Card

**Date**: November 10, 2025  
**Project**: Jouster.org  
**Status**: Ready to deploy CloudFront + DNS

---

## ✅ Current Status

| Component | Status | Details |
|-----------|--------|---------|
| SSL Certificate | ✅ **ISSUED** | Valid until Nov 4, 2026 |
| CloudFront | ❌ Not Created | Ready to create |
| Route 53 DNS | ❌ Not Configured | Pending CloudFront |

---

## 🚀 Quick Start (3 Commands)

```cmd
cd H:\projects\Jouster\aws\scripts

REM 1. Check current status
.\check-ssl-status.bat

REM 2. Run complete setup (interactive)
.\setup-ssl-complete.bat

REM 3. Verify when done
.\check-ssl-status.bat
```

---

## 📋 Individual Commands

### Check Status
```cmd
.\check-ssl-status.bat
```

### Create CloudFront Distribution
```cmd
.\setup-ssl-cloudfront.bat
```
**Time**: 20-30 minutes (includes deployment wait)

### Configure Route 53 DNS
```cmd
.\setup-route53-dns.bat [DIST_ID] [CF_DOMAIN]
```
**Example**:
```cmd
.\setup-route53-dns.bat E1234567ABCDEF d1abc234xyz.cloudfront.net
```

### Complete Setup (All Steps)
```cmd
.\setup-ssl-complete.bat
```
**Time**: 40-60 minutes (interactive)

---

## 🔑 Key Information

### SSL Certificate
```
ARN: arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617
Certificate Region: us-east-1 (AWS requirement for CloudFront)
Domains: jouster.org, www.jouster.org
Status: ISSUED ✅
```

### S3 Bucket
```
Name: jouster-org-static
Endpoint: jouster-org-static.s3-website-us-west-2.amazonaws.com
Region: us-west-2
```

**Important**: ACM certificates for CloudFront MUST be in us-east-1, but S3 buckets and other resources can be in any region (we use us-west-2).

---

## 📝 Post-CloudFront Creation

After CloudFront is created, you'll get:
- **Distribution ID**: E1234567ABCDEF (example)
- **CloudFront Domain**: d1abc234xyz.cloudfront.net (example)

**Save these!** You'll need them for DNS setup.

Location: `tmp\cloudfront-production-info.txt`

---

## ⏱️ Timeline

| Step | Duration | Status |
|------|----------|--------|
| 1. Create CloudFront | 5 min (script) + 20 min (deploy) | ⏳ Waiting |
| 2. Configure Route 53 | 10 min | ⏳ Pending |
| 3. Update Registrar | 5 min | ⏳ Manual |
| 4. DNS Propagation | 15-30 min | ⏳ Automatic |
| **Total** | **~60 min** | |

---

## ✅ Success Checklist

- [ ] Run `check-ssl-status.bat` - Certificate shows ISSUED
- [ ] Run `setup-ssl-cloudfront.bat` - CloudFront created
- [ ] Wait for CloudFront Status = "Deployed" (~20 min)
- [ ] Test CloudFront URL: `https://[cf-domain].cloudfront.net`
- [ ] Run `setup-route53-dns.bat` - DNS configured
- [ ] Update nameservers at domain registrar
- [ ] Wait for DNS propagation (15-30 min)
- [ ] Test: `nslookup jouster.org`
- [ ] Visit: `https://jouster.org` - Shows green padlock
- [ ] Visit: `https://www.jouster.org` - Works correctly

---

## 🔧 Verification Commands

### Check CloudFront Deployment Status
```cmd
aws cloudfront get-distribution --id E1234567ABCDEF --query "Distribution.Status" --output text
```
**Expected**: `Deployed`

### Check DNS Resolution
```cmd
nslookup jouster.org
nslookup jouster.org 8.8.8.8
```
**Expected**: CloudFront IP addresses

### Test HTTPS
```cmd
curl -I https://jouster.org
```
**Expected**: `HTTP/2 200`

---

## 🚨 Troubleshooting

### CloudFront Creation Fails
**Error**: "Aliases already in use"
- Solution: Check for existing distributions using jouster.org
- Command: `aws cloudfront list-distributions`

### DNS Not Resolving
**Issue**: `nslookup jouster.org` returns NXDOMAIN
- Check: Nameservers updated at registrar?
- Check: DNS propagation time (wait 15-30 more minutes)

### SSL Certificate Error
**Issue**: Browser shows "Not Secure"
- Check: CloudFront using correct certificate ARN?
- Check: DNS pointing to CloudFront (not S3)?

---

## 📞 Quick Help

| Issue | Solution |
|-------|----------|
| Certificate not ISSUED | Already ISSUED - no action needed ✅ |
| CloudFront taking too long | Normal - wait 20-30 minutes |
| DNS not working | Update nameservers at registrar |
| HTTPS shows error | Verify CloudFront certificate config |

---

## 📚 Documentation

- **Full Guide**: `docs\SSL-CLOUDFRONT-SETUP-GUIDE.md`
- **Deployment**: `docs\DEPLOYMENT.md`
- **Scripts Location**: `aws\scripts\`

---

## 💰 Cost Estimate

- SSL Certificate: **FREE**
- CloudFront: **~$1-5/month** (low traffic)
- Route 53: **~$0.50/month**
- **Total**: **~$1.50-6/month**

---

## 🎯 After Setup Complete

### Update Deployment Workflow
```cmd
REM 1. Build
npm run build

REM 2. Upload to S3
aws s3 sync dist\jouster-ui s3://jouster-org-static\ --delete

REM 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E1234567ABCDEF --paths "/*"
```

### Monitor Site
- CloudWatch: Monitor CloudFront metrics
- SSL Labs: Test SSL configuration
- DNS Check: Verify DNS records

---

**Last Updated**: November 10, 2025  
**Next Action**: Run `setup-ssl-complete.bat` to begin

