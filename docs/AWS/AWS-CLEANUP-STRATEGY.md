# AWS Resource Cleanup - Automated Strategy

**Date**: 2025-11-13  
**Status**: 📋 **PLANNED**

---

## 🎯 Problem Statement

**Current Issue**: AWS resources (S3 buckets, CloudFront distributions, DNS records) are created for feature branches and PRs but not always cleaned up when branches are deleted or PRs are closed.

**Evidence**:
- Old PR preview buckets: `jouster-preview-pr-4`, `jouster-preview-pr-5`, `jouster-preview-pr15`
- Deprecated buckets: `jouster-org-green`, `jouster-org-static`, `jouster-org-main` (manually cleaned)
- Duplicate staging buckets: `staging.jouster.org` vs `stg.jouster.org`
- QA blue/green buckets: Need evaluation if still used

**Impact**:
- 💰 **Cost**: Paying for unused resources
- 🗂️ **Clutter**: Hard to identify active vs deprecated resources
- 🔒 **Security**: Orphaned resources may have outdated security policies
- 🐛 **DNS Confusion**: Old buckets cached by DNS causing routing issues

---

## 📚 Best Practices Research

### Industry Standards (AWS Well-Architected Framework)

**1. Tagging Strategy**
- Tag all resources with: `Environment`, `Branch`, `PRNumber`, `CreatedBy`, `CreatedAt`
- Enables filtering and bulk operations
- Required for cost tracking

**2. Lifecycle Policies**
- S3: Automatic expiration after X days
- CloudFormation: Automatic stack deletion
- Lambda: Scheduled cleanup functions

**3. Infrastructure as Code (IaC)**
- Use CloudFormation/Terraform for resource creation
- Built-in cleanup on stack deletion
- Version controlled and auditable

**4. Event-Driven Cleanup**
- GitHub webhooks trigger cleanup on PR close/branch delete
- CloudWatch Events for scheduled cleanup
- Lambda functions for automated deletion

**5. Resource Naming Conventions**
- Include branch/PR identifier in name
- Makes identification and cleanup easier
- Example: `jouster-preview-pr123`, `jouster-feature-auth-menu`

---

## ✅ Current State Analysis

### What We Already Have

**✅ PR Preview Cleanup Workflow**:
- File: `.github/workflows/pull-request-delete-preview.yml`
- Triggers: When PR is closed
- Actions:
  - Deletes S3 bucket (`jouster-preview-pr{number}`)
  - Deletes Route53 DNS records (if exist)
- Status: **Working** (but has orphaned buckets from before workflow existed)

**✅ Naming Convention**:
- PR previews: `jouster-preview-pr{number}`
- Environments: `qa.jouster.org`, `stg.jouster.org`, `jouster-org-west`
- Status: **Mostly consistent**

### What We're Missing

**❌ Branch Cleanup Workflow**:
- Feature branches don't trigger cleanup
- No automated cleanup when branch is deleted
- Manual intervention required

**❌ Scheduled Cleanup Job**:
- No periodic scan for orphaned resources
- Old resources linger indefinitely
- Relies on event-driven cleanup only

**❌ Resource Tagging**:
- Resources not tagged with metadata
- Hard to identify orphaned resources
- No cost allocation tracking

**❌ Lifecycle Policies**:
- No automatic expiration for temporary resources
- Preview environments persist indefinitely
- No retention policies

---

## 🎯 Recommended Strategy

### Phase 1: Immediate Cleanup (Manual - DONE ✅)
- ✅ Delete deprecated production buckets (green, static, main)
- ⏳ Delete old PR preview buckets (pr-4, pr-5, pr15)
- ⏳ Evaluate QA blue/green buckets
- ⏳ Investigate staging duplicate bucket

### Phase 2: Enhance Existing Workflows (Week 1)
1. **Improve PR Preview Cleanup**:
   - Add error handling
   - Add logging/notifications
   - Handle CloudFront distributions (if created)
   - Add retry logic

2. **Add Branch Deletion Cleanup**:
   - New workflow: Trigger on branch delete
   - Clean up any resources for that branch
   - Use naming convention to find resources

### Phase 3: Scheduled Cleanup (Week 2)
1. **Weekly Cleanup Job**:
   - Scan all S3 buckets with `jouster-preview-*` pattern
   - Check if associated PR is closed
   - Delete if PR closed > 7 days ago

2. **Monthly Audit**:
   - List all Jouster resources
   - Flag resources without activity > 30 days
   - Manual review before deletion

### Phase 4: Long-term Improvements (Future)
1. **Resource Tagging**:
   - Add tags to all created resources
   - Enable cost allocation
   - Easier filtering and cleanup

2. **Lifecycle Policies**:
   - S3: Auto-delete objects > 30 days old in preview buckets
   - CloudWatch: Auto-delete logs > 90 days old

3. **Infrastructure as Code**:
   - Use CloudFormation/Terraform for all resources
   - Automatic cleanup on stack deletion

---

## 📋 Implementation Plan

See separate documents:
- `AWS-CLEANUP-IMPLEMENTATION-PHASE1.md` - Immediate cleanup tasks
- `AWS-CLEANUP-IMPLEMENTATION-PHASE2.md` - Workflow enhancements
- `AWS-CLEANUP-IMPLEMENTATION-PHASE3.md` - Scheduled cleanup jobs
- `AWS-CLEANUP-IMPLEMENTATION-PHASE4.md` - Long-term improvements

---

## 🔗 Related Files

- `.github/workflows/pull-request-delete-preview.yml` - Existing PR cleanup
- `docs/S3-BUCKET-CLEANUP-SUMMARY.md` - Recent manual cleanup
- `docs/NEXT-STEPS.md` - Overall project roadmap

---

**Status**: Plan created, ready for implementation  
**Next Action**: Create Phase 1 implementation document

