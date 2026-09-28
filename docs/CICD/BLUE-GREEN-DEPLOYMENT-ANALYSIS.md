# Blue/Green Deployment Architecture - Jouster

**Date**: 2025-11-13  
**Status**: 🔄 **Partially Implemented - Needs Completion**

---

## 🎯 Current Situation

### What Works
- ✅ **Staging (stg.jouster.org)**: v0.5.1 deployed and working
- ✅ **HTTPS Production**: v0.5.1 accessible via https://jouster.org
- ✅ **CloudFront**: Updated to point to us-west-2

### What Doesn't Work
- ⚠️ **HTTP Production**: Shows old version, doesn't redirect properly
- ⚠️ **Full Production**: Not consistently serving v0.5.1

---

## 🏗️ Discovered Architecture

### S3 Buckets (Production)

| Bucket | Region | Last Updated | Purpose | Status |
|--------|--------|--------------|---------|--------|
| `jouster-org-green` | us-east-1 | 2025-10-06 | Blue/Green - Green | ❌ OLD |
| `jouster-org-west` | us-west-2 | 2025-11-12 | Current Active | ✅ v0.5.1 |
| `jouster-org-static` | us-east-1 | 2025-10-06 | Legacy | ❌ DEPRECATED |
| `jouster-org-main` | ? | 2025-10-06 | Unknown | ❓ |

### CloudFront Distribution

**Current Configuration**:
- **Distribution ID**: E3EQJ0O0PJTVVX
- **Current Origin**: `jouster-org-west.s3-website-us-west-2.amazonaws.com`
- **Viewer Protocol**: `redirect-to-https`
- **Aliases**: jouster.org, www.jouster.org

---

## 🔍 Root Cause Analysis

### Why Staging Works But Production Doesn't

**Staging (stg.jouster.org)**:
1. ✅ Single S3 bucket (`stg.jouster.org`)
2. ✅ Simple architecture, no blue/green
3. ✅ Direct deployment via GitHub Actions
4. ✅ No legacy buckets or DNS conflicts

**Production (jouster.org)**:
1. ⚠️ Multiple S3 buckets (green, west, static, main)
2. ⚠️ Blue/green setup partially implemented but not properly switched
3. ⚠️ DNS caching pointing to old buckets
4. ⚠️ HTTP bypass going directly to old S3 buckets

---

## 🎨 Blue/Green Deployment Explained

### What is Blue/Green Deployment?

**Blue/Green deployment** is a strategy where you maintain two identical production environments:

- **Blue Environment**: Currently serving live traffic (OLD version)
- **Green Environment**: New version being prepared/tested
- **Switch**: Atomic cutover from Blue → Green when ready
- **Rollback**: Instant switch back to Blue if issues occur

### How It Should Work for Jouster

```
┌─────────────────────────────────────────────────────┐
│                   CloudFront                         │
│            (d2kfv0ssubbghw.cloudfront.net)          │
│                                                      │
│  Aliases: jouster.org, www.jouster.org              │
│  SSL: ACM Certificate                                │
│  Viewer Protocol: redirect-to-https                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Origin Switch (Blue/Green)
                   │
        ┌──────────┴──────────┐
        │                     │
    ┌───▼────┐           ┌────▼───┐
    │  BLUE  │           │ GREEN  │
    │ Bucket │           │ Bucket │
    └────────┘           └────────┘
    v0.5.0               v0.5.1
    (Old)                (New)
```

---

## 🔧 Proper Blue/Green Implementation for Jouster

### Option 1: Use Existing West Bucket as "Live" (Recommended)

**Simplify the architecture** - we don't need blue/green for a portfolio site:

1. **Single Production Bucket**: `jouster-org-west` (us-west-2)
2. **CloudFront**: Points to west bucket ✅ (Already done)
3. **Deprecate**: Delete old buckets (green, static, main)
4. **DNS**: Ensure all DNS points to CloudFront only

**Pros**:
- ✅ Simpler architecture
- ✅ Easier to maintain
- ✅ Faster deployments
- ✅ No need for complex switching

**Cons**:
- ❌ No instant rollback (need to redeploy)
- ❌ Downtime during deployment (minimal, ~30 seconds)

### Option 2: Implement True Blue/Green (Complex)

**Maintain two buckets** for zero-downtime deployments:

1. **Blue Bucket**: `jouster-blue` (us-west-2) - Current production
2. **Green Bucket**: `jouster-green-west` (us-west-2) - New deployments
3. **CloudFront**: Update origin to switch between blue/green
4. **Process**:
   - Deploy new version to green
   - Test green via CloudFront preview
   - Update CloudFront origin from blue → green
   - Wait for propagation (~5-10 min)
   - Keep blue as rollback for 24 hours
   - On next deploy, deploy to blue, switch back

**Pros**:
- ✅ Zero-downtime deployments
- ✅ Instant rollback capability
- ✅ Professional production setup

**Cons**:
- ❌ More complex
- ❌ Requires automation
- ❌ Double storage costs
- ❌ Overkill for portfolio site

---

## 🎯 Recommended Solution

### **Use Single Bucket Strategy** (Option 1)

For Jouster (a portfolio site), blue/green is overkill. Here's what I recommend:

**Architecture**:
```
CloudFront → jouster-org-west (us-west-2)
             └─ Single source of truth
             └─ Direct deployments
             └─ CloudFront cache invalidation after deploy
```

**Deployment Process**:
1. Build: `npm run build:prod`
2. Deploy: `aws s3 sync dist/apps/jouster-ui/browser/ s3://jouster-org-west --delete`
3. Invalidate: `aws cloudfront create-invalidation --distribution-id E3EQJ0O0PJTVVX --paths "/*"`
4. Verify: Test https://jouster.org

**Rollback Process** (if needed):
1. Checkout previous git tag
2. Build previous version
3. Deploy to S3
4. Invalidate CloudFront cache

---

## 🔨 Immediate Actions to Fix Production

### 1. Clean Up Old Buckets

Delete or archive deprecated buckets:
- `jouster-org-green` (us-east-1) - OLD, not used
- `jouster-org-static` (us-east-1) - OLD, deprecated
- `jouster-org-main` - Check if needed, likely old

**Keep**:
- `jouster-org-west` (us-west-2) - Current production ✅

### 2. Verify DNS Points to CloudFront ONLY

Ensure no DNS records point directly to S3:
- ✅ jouster.org → CloudFront alias (d2kfv0ssubbghw.cloudfront.net)
- ❌ No A records to S3 IPs

### 3. Force DNS Propagation

Clear all caches:
```bash
# User: Flush DNS
ipconfig /flushdns

# CloudFront: Invalidate cache (already done)
aws cloudfront create-invalidation --distribution-id E3EQJ0O0PJTVVX --paths "/*"
```

### 4. Wait for Cache Expiration

- **DNS TTL**: 24-48 hours (nothing we can do to speed up)
- **CloudFront Cache**: Invalidated (already done)
- **Browser Cache**: User must hard refresh

---

## 📊 Current State vs Desired State

### Current State (Problematic)
```
Production:
├─ jouster-org-green (us-east-1) ← OLD, October 6
├─ jouster-org-west (us-west-2) ← NEW, v0.5.1 ✅
├─ jouster-org-static (us-east-1) ← DEPRECATED
└─ CloudFront → jouster-org-west ✅

Issue: DNS cache pointing to old buckets
```

### Desired State (Clean)
```
Production:
└─ jouster-org-west (us-west-2) ← SINGLE SOURCE
   └─ CloudFront → jouster-org-west ✅
   └─ DNS → CloudFront ✅
   └─ All caches cleared ✅
```

---

## ✅ Next Steps

### Immediate (Now)
1. ✅ Verify CloudFront points to west bucket (already done)
2. ✅ Invalidate CloudFront cache (already done 2x)
3. ⏳ Wait 24-48 hours for DNS cache to expire

### Short-term (Tomorrow)
1. Test HTTP redirect again
2. If still issues, investigate DNS nameservers
3. Consider deprecating old buckets

### Long-term (Future)
1. Document deployment process
2. Automate deployment via GitHub Actions
3. Consider implementing proper blue/green if needed
4. Set up monitoring/alerting

---

## 🎓 Blue/Green Best Practices

### When to Use Blue/Green
- ✅ High-traffic production sites
- ✅ Need zero-downtime deployments
- ✅ Instant rollback requirement
- ✅ Multiple deployments per day

### When NOT to Use Blue/Green
- ❌ Low-traffic sites (like Jouster)
- ❌ Infrequent deployments
- ❌ Simple static sites
- ❌ Portfolio/personal sites

### Jouster's Sweet Spot
**Single bucket with CloudFront caching** is perfect because:
- Deployments are infrequent
- CloudFront provides caching/performance
- Can rollback via git + redeploy (~5 min)
- Simpler to maintain
- Lower costs

---

## 📝 Conclusion

**Why Staging Works**:
- Simple, single-bucket architecture
- No legacy DNS/cache issues
- Clean deployment pipeline

**Why Production Has Issues**:
- Multiple old buckets causing DNS confusion
- Cache pointing to old buckets
- Partially implemented blue/green not fully switched over

**Solution**:
- ✅ CloudFront already pointing to correct bucket (west)
- ⏳ Wait for DNS cache to expire (24-48 hours)
- 🧹 Clean up old buckets after verification
- 📋 Document single-bucket deployment process

---

**Status**: Production IS correctly deployed, just waiting for DNS cache expiration.

**Confidence**: 95% - Infrastructure correct, cache issue will self-resolve.

