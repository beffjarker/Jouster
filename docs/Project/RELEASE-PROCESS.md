# Jouster Release Process - Best Practices

**Date**: November 11, 2025  
**Version**: 1.0  
**Status**: Active

---

## 📋 Overview

This document defines the proper release process for Jouster, following Git Flow best practices with multiple environment verification.

---

## 🌊 Git Flow Structure

```
main (production)
  ↑
  └─ release/vX.X.X (staging testing)
       ↑
       └─ develop (active development)
            ↑
            └─ feature/* (feature branches)
```

### Branch Purposes

| Branch | Environment | Purpose | Deploys To |
|--------|------------|---------|------------|
| `feature/*` | Preview | Feature development | PR preview environments |
| `develop` | QA | Integration testing | qa.jouster.org |
| `release/vX.X.X` | Staging | Pre-production verification | stg.jouster.org (manual/workflow) |
| `main` | Production | Live production code | jouster.org |

---

## 🚀 Release Workflow

### Phase 1: Feature Development

**Branch**: `feature/feature-name`  
**Environment**: PR Preview  
**Duration**: Days to weeks

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Develop and commit
git add .
git commit -m "feat(scope): add feature"

# Push and create PR
git push origin feature/my-feature
# Create PR → develop
```

**Verification**:
- ✅ Preview environment deployed automatically
- ✅ Code review completed
- ✅ Tests passing
- ✅ PR approved and merged

---

### Phase 2: QA Testing

**Branch**: `develop`  
**Environment**: QA (qa.jouster.org)  
**Duration**: Hours to days

**Triggers**: Automatic on merge to develop

```bash
# After feature PR merge
# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds application
# 3. Deploys to qa.jouster.org
```

**Verification**:
- ✅ All features work in integrated environment
- ✅ No regressions
- ✅ QA team approval
- ✅ Ready for staging

---

### Phase 3: Create Release Branch

**Branch**: `release/vX.X.X`  
**Created From**: `develop`  
**Duration**: N/A (instant)

```bash
# On develop branch
git checkout develop
git pull origin develop

# Create release branch
git checkout -b release/v0.5.0

# Update version in package.json
npm version 0.5.0 --no-git-tag-version

# Commit version bump
git add package.json
git commit -m "chore: bump version to 0.5.0"

# Push release branch
git push origin release/v0.5.0
```

**Verification**:
- ✅ Version bumped in package.json
- ✅ Release branch created
- ✅ Pushed to GitHub

---

### Phase 4: Staging Deployment & Testing

**Branch**: `release/vX.X.X` OR `main` (after merge)  
**Environment**: Staging (stg.jouster.org)  
**Duration**: 1-4 hours (HUMAN TESTING REQUIRED)

#### Option A: Deploy Release Branch to Staging (Manual)

```bash
# Checkout release branch
git checkout release/v0.5.0

# Build for staging
npm run build

# Deploy to staging S3 bucket
aws s3 sync dist/jouster/browser/ s3://stg.jouster.org --delete --region us-west-2
```

#### Option B: Merge to Main First (Automated - RECOMMENDED)

```bash
# Merge release branch to main
git checkout main
git pull origin main
git merge release/v0.5.0 --no-ff
git push origin main

# GitHub Actions automatically deploys main → stg.jouster.org
```

**Staging Test Checklist**:
- [ ] **Functional Testing** (1 hour)
  - [ ] All features work correctly
  - [ ] Navigation functions properly
  - [ ] No console errors
  - [ ] Forms submit correctly
  - [ ] Authentication works (if applicable)
- [ ] **Cross-Browser Testing** (30 min)
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] **Responsive Testing** (30 min)
  - [ ] Desktop (1920x1080)
  - [ ] Tablet (768px)
  - [ ] Mobile (375px)
- [ ] **Performance Testing** (30 min)
  - [ ] Page load times acceptable
  - [ ] No memory leaks
  - [ ] Network requests optimized
- [ ] **Regression Testing** (30 min)
  - [ ] Previously working features still work
  - [ ] No new bugs introduced
  - [ ] Data integrity maintained

**Required Approvals**:
- [ ] Product Owner sign-off
- [ ] QA Team sign-off
- [ ] Technical Lead sign-off

**Approval Template**:
```
STAGING APPROVAL - Release v0.5.0

Tested by: [Name]
Date: [YYYY-MM-DD]
Duration: [X hours]
Environment: stg.jouster.org
Build: [commit SHA]

Test Results:
- Functional: PASS / FAIL
- Cross-Browser: PASS / FAIL
- Responsive: PASS / FAIL
- Performance: PASS / FAIL
- Regression: PASS / FAIL

Issues Found: [None / List issues]

Recommendation: ✅ APPROVED FOR PRODUCTION / ❌ NOT APPROVED

Notes: [Any additional comments]

Signature: _______________
```

---

### Phase 5: Merge to Main (Production Ready)

**Branch**: `main`  
**Merged From**: `release/vX.X.X`  
**Duration**: Minutes

**⚠️ CRITICAL**: Only proceed after staging approval!

```bash
# Ensure you have latest
git checkout main
git pull origin main

# Merge release branch (no fast-forward to preserve history)
git merge release/v0.5.0 --no-ff -m "chore: merge release v0.5.0 to main"

# Push to main
git push origin main

# Create and push git tag
git tag -a v0.5.0 -m "Release v0.5.0 - [Brief description]"
git push origin v0.5.0
```

**Verification**:
- ✅ Release merged to main
- ✅ Git tag created
- ✅ GitHub Actions triggered for staging deployment (main → stg.jouster.org)
- ✅ Staging shows latest changes

---

### Phase 6: Production Deployment

**Branch**: `main`  
**Environment**: Production (jouster.org)  
**Duration**: 5-15 minutes

**Trigger**: Manual (after final staging verification from main)

```bash
# Already on main branch after merge
# Build production
npm run build

# Deploy to production S3
aws s3 sync dist/jouster/browser/ s3://jouster-org-static --delete --region us-west-2

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3EQJ0O0PJTVVX \
  --paths "/*"

# Wait 2-3 minutes for cache invalidation
# Verify production
curl -I https://jouster.org
```

**Production Verification**:
- ✅ Application loads at https://jouster.org
- ✅ Correct version deployed
- ✅ No errors in console
- ✅ CloudFront serving content
- ✅ HTTPS working correctly

---

### Phase 7: Merge Back to Develop

**Branch**: `develop`  
**Merged From**: `main`  
**Duration**: Minutes

**Purpose**: Ensure any hotfixes or changes made during release are back in develop

```bash
# Checkout develop
git checkout develop
git pull origin develop

# Merge main back to develop
git merge main --no-ff -m "chore: merge main back to develop after v0.5.0 release"

# Push to develop
git push origin develop
```

**Verification**:
- ✅ Develop has all changes from main
- ✅ Version numbers match
- ✅ No conflicts

---

### Phase 8: Cleanup & Documentation

**Duration**: 15-30 minutes

```bash
# Delete release branch (optional - some teams keep them)
git branch -d release/v0.5.0
git push origin --delete release/v0.5.0

# Create GitHub Release
gh release create v0.5.0 \
  --title "v0.5.0 - [Release Title]" \
  --notes "$(cat RELEASE-NOTES.md)"

# Update CHANGELOG.md
# Document what was released

# Communicate to team
# Send release notes email/Slack message
```

**Documentation Checklist**:
- [ ] GitHub Release created with notes
- [ ] CHANGELOG.md updated
- [ ] Team notified
- [ ] Stakeholders informed
- [ ] Release branch deleted (if policy)

---

## 📊 Environment Deployment Matrix

| Environment | Branch | Trigger | URL | Auto-Deploy |
|-------------|--------|---------|-----|-------------|
| **Preview** | `feature/*` | PR opened | `http://jouster-preview-prXX.s3-website-us-west-2.amazonaws.com` | ✅ Yes |
| **QA** | `develop` | Push/merge to develop | `https://qa.jouster.org` | ✅ Yes |
| **Staging** | `main` | Push/merge to main | `https://stg.jouster.org` | ✅ Yes |
| **Production** | `main` | Manual trigger | `https://jouster.org` | ❌ Manual |

---

## 🔄 Complete Release Flow Diagram

```
┌─────────────────┐
│ Feature Branch  │
│ feature/name    │
└────────┬────────┘
         │ PR Review & Merge
         ↓
┌─────────────────┐
│ Develop Branch  │ → Auto-deploy to qa.jouster.org
│ develop         │
└────────┬────────┘
         │ Create Release
         ↓
┌─────────────────┐
│ Release Branch  │
│ release/vX.X.X  │
└────────┬────────┘
         │ Test & Approve in Staging
         ↓
┌─────────────────┐
│ Main Branch     │ → Auto-deploy to stg.jouster.org
│ main            │ → Manual-deploy to jouster.org (production)
└────────┬────────┘
         │ Merge back
         ↓
┌─────────────────┐
│ Develop Branch  │
│ develop         │
└─────────────────┘
```

---

## ⚠️ Critical Rules

### DO ✅

1. **Always test in preview** before merging features
2. **Always test in QA** before creating release
3. **Always test in staging** before production deploy
4. **Always get approval** from stakeholders for production
5. **Always merge main back to develop** after release
6. **Always create git tags** for releases
7. **Always document** what was released

### DON'T ❌

1. **Never skip staging testing** - This caused the v1.0.0 revert
2. **Never deploy directly to production** without staging approval
3. **Never merge feature branches to main** - Always go through develop
4. **Never delete release tags** - Permanent version history
5. **Never commit secrets** - Use environment variables
6. **Never force push to main or develop** - Preserve history

---

## 🚨 Emergency Hotfix Process

For critical production bugs that need immediate fix:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix the bug
# ... make changes ...
git add .
git commit -m "fix: critical production bug"

# Test locally
npm run build
npm run test

# Merge to main
git checkout main
git merge hotfix/critical-bug --no-ff
git push origin main

# Deploy to production immediately
npm run build
aws s3 sync dist/jouster/browser/ s3://jouster-org-static --delete --region us-west-2
aws cloudfront create-invalidation --distribution-id E3EQJ0O0PJTVVX --paths "/*"

# Merge back to develop
git checkout develop
git merge hotfix/critical-bug --no-ff
git push origin develop

# Tag hotfix
git tag -a v0.5.1 -m "Hotfix: Critical bug"
git push origin v0.5.1

# Delete hotfix branch
git branch -d hotfix/critical-bug
```

---

## 📚 References

- **Git Flow**: https://nvie.com/posts/a-successful-git-branching-model/
- **GitHub Flow**: https://guides.github.com/introduction/flow/
- **Semantic Versioning**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-11 | Initial release process documentation |

---

**Summary**: The key best practice is **release branches merge to main, then main merges back to develop**. This ensures production code is always on main, and all changes flow back to development.

