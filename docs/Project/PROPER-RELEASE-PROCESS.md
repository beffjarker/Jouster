# Proper Release Process for Jouster

**Version**: 0.5.0  
**Status**: Pre-Production  
**Date**: November 11, 2025

---

## ⚠️ Lesson Learned: Premature 1.0.0 Release

**What Happened**: Version 1.0.0 was released prematurely without proper staging verification and human testing. This violated fundamental deployment best practices.

**Issues**:
1. ❌ Skipped human verification in staging
2. ❌ No manual testing of release branch before production
3. ❌ Rushed from develop → main without validation
4. ❌ Production (jouster.org) not showing latest tested version

**Resolution**: Version reverted to 0.5.0 to follow proper release process.

---

## ✅ Correct Release Process (Blue/Green Deployment)

### Environment Flow

```
Developer → Preview (PR) → QA (develop) → Staging (release/*) → Production (main)
              ↓              ↓              ↓ HUMAN TEST       ↓
           Auto-deploy   Auto-deploy    MANUAL VERIFY    Manual deploy
```

---

## 📋 Step-by-Step Release Process

### Phase 1: Feature Development ✅ DONE

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Develop & Test Locally**
   - Write code
   - Test locally
   - Commit changes

3. **Create Pull Request**
   - PR to `develop` branch
   - Preview environment auto-deploys
   - Test preview: `http://jouster-preview-pr*.s3-website-us-west-2.amazonaws.com`

4. **Review & Merge**
   - Code review
   - Tests pass
   - Merge to `develop`

### Phase 2: QA Testing ✅ DONE

1. **QA Auto-Deployment**
   - `develop` branch auto-deploys to QA
   - URL: http://qa.jouster.org

2. **QA Verification**
   - Test all features
   - Verify bug fixes
   - Check regressions
   - **Human approval required**

### Phase 3: Staging (Release Branch) ⚠️ SKIPPED - MUST DO

1. **Create Release Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v0.5.0
   ```

2. **Version Bump**
   ```bash
   npm version 0.5.0 --no-git-tag-version
   ```

3. **Update CHANGELOG**
   - Document all changes
   - Breaking changes
   - New features
   - Bug fixes

4. **Deploy to Staging**
   ```bash
   # Build release candidate
   npm run build
   
   # Deploy to staging S3 bucket
   aws s3 sync dist/jouster-ui s3://staging.jouster.org --delete --region us-west-2
   
   # Or use staging workflow
   git push origin release/v0.5.0
   # Triggers staging-deploy.yml
   ```

5. **🚨 HUMAN TESTING IN STAGING (CRITICAL)**
   - **URL**: http://staging.jouster.org (or staging S3 endpoint)
   - **Who**: Product owner, QA team, stakeholders
   - **What to Test**:
     - ✅ All new features work
     - ✅ No regressions in existing features
     - ✅ Navigation shows correct items
     - ✅ HTTPS redirects work (if testing with CloudFront)
     - ✅ Performance acceptable
     - ✅ No console errors
     - ✅ Mobile and desktop UX
   - **Duration**: At least 1-2 hours of testing
   - **Sign-off**: Explicit approval required before production

6. **Fix Issues in Release Branch (if needed)**
   ```bash
   # Make fixes in release branch
   git add .
   git commit -m "fix: issue found in staging"
   git push origin release/v0.5.0
   
   # Re-test in staging
   ```

### Phase 4: Production Deployment (After Staging Approval) ⏸️ PENDING

1. **Merge Release Branch to Main**
   ```bash
   # After staging approval
   git checkout main
   git merge release/v0.5.0
   ```

2. **Create Git Tag**
   ```bash
   git tag -a v0.5.0 -m "Release v0.5.0 - HTTPS & Auth Navigation"
   git push origin v0.5.0
   ```

3. **Deploy to Production**
   ```bash
   # Build production
   npm run build
   
   # Deploy to production S3
   aws s3 sync dist/jouster-ui s3://jouster-org-static --delete --region us-west-2
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation \
     --distribution-id E3EQJ0O0PJTVVX \
     --paths "/*"
   ```

4. **Verify Production**
   - **URL**: https://jouster.org
   - Test immediately after deployment
   - Verify changes are live
   - Monitor for issues

5. **Create GitHub Release**
   ```bash
   gh release create v0.5.0 \
     --title "v0.5.0 - HTTPS Infrastructure & Auth Navigation" \
     --notes-file release-notes.md
   ```

6. **Merge Back to Develop**
   ```bash
   # Sync any hotfixes back to develop
   git checkout develop
   git merge main
   git push origin develop
   ```

---

## 🎯 Deployment Checklist

### Before Staging Deployment
- [ ] All features merged to `develop`
- [ ] QA environment tested and approved
- [ ] Release branch created from `develop`
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG updated
- [ ] Release notes prepared

### Staging Verification (CRITICAL - DO NOT SKIP)
- [ ] Deploy to staging environment
- [ ] **Human testing completed** (1-2 hours minimum)
- [ ] Product owner sign-off received
- [ ] QA team approval received
- [ ] All issues fixed and re-tested
- [ ] Performance acceptable
- [ ] No critical bugs found
- [ ] **Explicit "GO" decision made**

### Production Deployment
- [ ] Staging approved by humans
- [ ] Release branch merged to `main`
- [ ] Git tag created and pushed
- [ ] Production build created
- [ ] Deployed to production S3
- [ ] CloudFront cache invalidated
- [ ] Production URL verified (https://jouster.org)
- [ ] GitHub release published
- [ ] Changes merged back to `develop`

---

## 🚨 Critical Rules

### Never Skip These Steps

1. **Human Testing in Staging**
   - ALWAYS require human verification
   - NEVER auto-deploy staging → production
   - Minimum 1-2 hours of testing
   - Explicit approval required

2. **Blue/Green Deployment**
   - Staging = "Blue" (release candidate)
   - Production = "Green" (live site)
   - Test blue before switching green

3. **Version Control**
   - Release branches for staging
   - Tags for production releases
   - Semantic versioning (major.minor.patch)

4. **Rollback Plan**
   - Keep previous version tagged
   - Can revert to previous S3 deployment
   - CloudFront invalidation for rollback

---

## 🔄 Rollback Process

If production has issues:

```bash
# Find previous version
git tag -l

# Checkout previous version
git checkout v0.4.0

# Rebuild
npm run build

# Redeploy
aws s3 sync dist/jouster-ui s3://jouster-org-static --delete --region us-west-2

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E3EQJ0O0PJTVVX \
  --paths "/*"
```

---

## 📊 Current Status

### What We Have Now (v0.5.0)

**Deployed Environments**:
- ✅ **Preview**: Auto-deploys for PRs
- ✅ **QA**: http://qa.jouster.org (auto-deploys from `develop`)
- ⚠️ **Staging**: NOT TESTED YET (release branch not deployed)
- ❌ **Production**: https://jouster.org (NOT showing latest version)

**Next Steps**:
1. Deploy release/v0.5.0 to staging environment
2. Conduct human testing in staging (1-2 hours)
3. Get explicit approval from stakeholders
4. THEN deploy to production

---

## 🎯 What Needs to Happen for v1.0.0

### Requirements for True 1.0.0 Release

1. **Staging Environment Setup**
   - Create staging.jouster.org S3 bucket (or use staging endpoint)
   - Configure staging deployment workflow
   - Test staging deployment process

2. **Human Verification**
   - Deploy current code to staging
   - Conduct thorough testing (2+ hours)
   - Document test results
   - Get stakeholder sign-off

3. **Production Deployment**
   - Deploy approved staging build to production
   - Verify https://jouster.org shows correct version
   - Confirm all features work in production

4. **Only Then**
   - Bump version to 1.0.0
   - Create 1.0.0 tag
   - Publish 1.0.0 release

---

## 📝 Deployment Artifacts

### For Each Release

**Required Files**:
- Release notes (CHANGELOG excerpt)
- Test results from staging
- Approval sign-offs
- Deployment checklist (completed)
- Rollback plan (documented)

**Git Artifacts**:
- Release branch: `release/vX.Y.Z`
- Git tag: `vX.Y.Z`
- GitHub release with notes

---

## ✅ Summary

**Current State**: v0.5.0 (pre-production)

**What Went Wrong**: Skipped staging verification, rushed to 1.0.0

**Lesson Learned**: NEVER skip human testing in staging

**Correct Process**:
1. Develop → Preview (auto)
2. Merge → QA (auto)
3. Release branch → Staging (manual deploy)
4. **Human test staging** ⚠️ CRITICAL
5. Approval → Production (manual deploy)

**Next Release**: Follow this process completely, no shortcuts

---

*Document created: November 11, 2025*  
*Current version: 0.5.0 (pre-production)*  
*Ready for 1.0.0: After staging verification*

