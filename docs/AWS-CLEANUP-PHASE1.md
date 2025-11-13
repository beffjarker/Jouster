# AWS Cleanup - Phase 1: Immediate Actions

**Date**: 2025-11-13  
**Priority**: High  
**Estimated Time**: 1-2 hours

---

## 🎯 Objectives

Clean up orphaned resources that exist from before automated cleanup workflows were implemented.

---

## ✅ Task 1: Delete Old PR Preview Buckets (READY TO DO)

### Resources to Delete
- `jouster-preview-pr-4` (created 2025-10-07)
- `jouster-preview-pr-5` (created 2025-10-13)
- `jouster-preview-pr15` (created 2025-11-11)

### Verification Steps
1. Check if PRs #4, #5, #15 are closed
2. Verify no active references to these buckets
3. Backup inventory (just in case)

### Commands
```bash
# Check if buckets exist and get inventory
aws s3 ls s3://jouster-preview-pr-4/ --recursive --summarize > tmp/pr4-inventory.txt
aws s3 ls s3://jouster-preview-pr-5/ --recursive --summarize > tmp/pr5-inventory.txt
aws s3 ls s3://jouster-preview-pr15/ --recursive --summarize > tmp/pr15-inventory.txt

# Delete buckets and contents
aws s3 rb s3://jouster-preview-pr-4 --force
aws s3 rb s3://jouster-preview-pr-5 --force
aws s3 rb s3://jouster-preview-pr15 --force

# Verify deletion
aws s3 ls | findstr jouster-preview
```

---

## ✅ Task 2: Evaluate QA Blue/Green Buckets

### Resources to Evaluate
- `jouster-qa-blue` (created 2025-10-14)
- `jouster-qa-green` (created 2025-10-14)

### Questions to Answer
1. Is QA using blue/green deployment?
2. Are both buckets actively used?
3. Can we consolidate to single bucket (`qa.jouster.org`)?

### Investigation
```bash
# Check contents and last modified
aws s3 ls s3://jouster-qa-blue/ --recursive
aws s3 ls s3://jouster-qa-green/ --recursive
aws s3 ls s3://qa.jouster.org/ --recursive

# Check which bucket is served
# Look at QA deployment workflow: .github/workflows/qa-deploy.yml
```

### Decision Matrix
| Scenario | Action |
|----------|--------|
| Both empty | Delete both, use `qa.jouster.org` only |
| Only one has files | Delete empty one, consolidate to active |
| Both active (blue/green) | Keep both, document usage |
| Neither used | Delete both, use `qa.jouster.org` only |

---

## ✅ Task 3: Investigate Staging Bucket Duplicate

### Resources to Investigate
- `staging.jouster.org` (created 2025-11-11)
- `stg.jouster.org` (created 2025-10-06) - **Currently active**

### Questions to Answer
1. Why do we have two staging buckets?
2. Which one is actually used?
3. Is `staging.jouster.org` from failed setup attempt?

### Investigation
```bash
# Check contents
aws s3 ls s3://staging.jouster.org/ --recursive
aws s3 ls s3://stg.jouster.org/ --recursive

# Check DNS records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z000159514WV2RRYC18A5 \
  --query "ResourceRecordSets[?contains(Name, 'staging') || contains(Name, 'stg')]"

# Check staging deployment workflow
# File: .github/workflows/staging-deploy.yml
```

### Likely Action
- **Keep**: `stg.jouster.org` (currently deployed, working)
- **Delete**: `staging.jouster.org` (likely failed setup attempt)

---

## ✅ Task 4: Delete Other Orphaned Resources

### Check for Orphaned CloudFront Distributions
```bash
# List all distributions
aws cloudfront list-distributions \
  --query "DistributionList.Items[].{Id:Id,Comment:Comment,Status:Status}" \
  --output table

# Look for unused distributions (not QA, Staging, Production)
```

### Check for Orphaned Route53 Records
```bash
# List all jouster DNS records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z000159514WV2RRYC18A5 \
  --query "ResourceRecordSets[?contains(Name, 'jouster')]" \
  --output table

# Look for orphaned preview subdomains
```

### Check for Orphaned IAM Roles/Policies
```bash
# List IAM roles for GitHub Actions
aws iam list-roles \
  --query "Roles[?contains(RoleName, 'GitHub') || contains(RoleName, 'Jouster')]" \
  --output table
```

---

## 📋 Execution Checklist

### Pre-Flight Checks
- [ ] Review which PRs are closed (check GitHub)
- [ ] Backup inventory of all resources to delete
- [ ] Verify production/staging/QA are unaffected
- [ ] Double-check resource names before deletion

### Execution Order
1. [ ] Delete old PR preview buckets (pr-4, pr-5, pr15)
2. [ ] Investigate and decide on QA blue/green buckets
3. [ ] Investigate and decide on staging duplicate bucket
4. [ ] Check for orphaned CloudFront distributions
5. [ ] Check for orphaned DNS records
6. [ ] Document decisions and results

### Post-Execution
- [ ] Verify resources deleted successfully
- [ ] Update documentation
- [ ] Commit changes to docs
- [ ] Update cost estimates (if tracked)

---

## 🚨 Safety Guidelines

**Before Deleting ANY Resource**:
1. ✅ Verify it's not production/staging/QA
2. ✅ Check last modified date (ensure not recently used)
3. ✅ Save inventory/backup
4. ✅ Confirm no DNS records point to it
5. ✅ Confirm no CloudFront distributions use it

**Resource Protection**:
Never delete these:
- `jouster-org-west` (production)
- `stg.jouster.org` (staging)
- `qa.jouster.org` (QA)
- `www.jouster.org` (www redirect)
- `jouster-email*` (email services)
- `jouster-dev-bucket` (development)

---

## 📊 Expected Results

### Resources to Delete (Estimated)
- 3 old PR preview buckets
- 1-2 QA buckets (if not used)
- 1 staging duplicate bucket
- 0-2 orphaned CloudFront distributions
- 0-5 orphaned DNS records

### Cost Savings (Estimated)
- S3 storage: ~$0.50/month
- CloudFront: ~$1-2/month
- Route53: ~$0.50/month
- **Total**: ~$2-3/month (small but adds up)

### Cleanup Benefits
- ✅ Clear resource inventory
- ✅ Easier to identify active resources
- ✅ Reduced confusion
- ✅ Better security posture

---

**Next Steps**: Execute checklist, document results, move to Phase 2

