# Staging Deployment Failure - Root Cause and Fix

**Date**: November 11, 2025  
**Time**: ~9:30 PM  
**Status**: 🔧 **FIXING - Build Path Issue Identified**

---

## 🔍 Root Cause Identified

The staging deployment failed due to **incorrect build output path** in the GitHub Actions workflow.

### The Problem:

**Workflow Expected Path**: `dist/jouster/browser/`  
**Actual Nx Build Path**: `dist/apps/jouster-ui/browser/`

**Why it failed**:
- The workflow tried to sync files from a directory that doesn't exist
- AWS S3 sync found no files to deploy
- Deployment completed "successfully" but deployed nothing

---

## ✅ Fixes Applied

### 1. Fixed Staging Workflow (.github/workflows/staging-deploy.yml)

**Changed line 91**:
```yaml
# Before:
aws s3 sync dist/jouster/browser/ s3://stg.jouster.org --delete --region us-west-2

# After:
aws s3 sync dist/apps/jouster-ui/browser/ s3://stg.jouster.org --delete --region us-west-2
```

### 2. Fixed Local Deployment Script (aws/scripts/deploy-staging.bat)

**Changed line 41**:
```bat
REM Before:
aws s3 sync dist/jouster/browser/ s3://stg.jouster.org --delete --region us-west-2

REM After:
aws s3 sync dist/apps/jouster-ui/browser/ s3://stg.jouster.org --delete --region us-west-2
```

### 3. Committed Fixes

Committed the fixes to current branch (should be main or develop).

---

## 🚀 Manual Deployment Steps

Since the automated deployment failed, here are the manual steps to deploy to staging:

### Option A: Use npm Script (Recommended)

```cmd
REM This builds and deploys in one command
npm run deploy:staging
```

**What it does**:
1. Builds the application with `npm run build:prod`
2. Creates/verifies S3 bucket `stg.jouster.org`
3. Syncs files to S3
4. Sets up DNS (if needed)
5. Outputs staging URL

**Expected completion**: 2-5 minutes

### Option B: Manual Step-by-Step

```cmd
REM Step 1: Build for production
npm run build:prod

REM Step 2: Verify build output
dir dist\apps\jouster-ui\browser

REM Step 3: Deploy to S3
aws s3 sync dist/apps/jouster-ui/browser/ s3://stg.jouster.org --delete --region us-west-2

REM Step 4: Test
curl -I http://stg.jouster.org.s3-website-us-west-2.amazonaws.com
```

### Option C: Re-run GitHub Actions

After committing the fix, push to main to trigger the workflow again:

```cmd
REM Push the fix
git push origin main

REM Wait 5-10 minutes for workflow to complete
REM Then visit: https://github.com/beffjarker/Jouster/actions
```

---

## 🔍 How to Verify Deployment Success

### Check 1: S3 Bucket Contents

```cmd
aws s3 ls s3://stg.jouster.org/ --recursive | head -20
```

**Should show**: index.html, main.js, polyfills.js, styles.css, assets/, etc.

### Check 2: Test S3 Website Endpoint

```cmd
curl -I http://stg.jouster.org.s3-website-us-west-2.amazonaws.com
```

**Should return**: `HTTP/1.1 200 OK`

### Check 3: Test Custom Domain (if DNS configured)

```cmd
curl -I https://stg.jouster.org
```

**Should return**: `HTTP/2 200` or redirect to HTTPS

### Check 4: Browser Test

Visit: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com

**Should show**:
- ✅ Jouster application loads
- ✅ Navigation shows 3 items (Flash Experiments, About, Contact)
- ✅ No console errors
- ✅ Page renders correctly

---

## 📋 Next Steps

### Immediate (NOW):

1. **Wait for manual deployment to complete** (~2-5 minutes)
   - Running: `npm run deploy:staging`
   - OR run it manually if not already running

2. **Verify deployment** using checks above

3. **Test staging site** at http://stg.jouster.org.s3-website-us-west-2.amazonaws.com

### After Successful Deployment:

1. **Push workflow fix to main**:
   ```cmd
   git push origin main
   ```

2. **Begin human testing** (see DEPLOYMENT-STATUS-v0.5.0.md)

3. **Get stakeholder approvals**

4. **Deploy to production** (after approval)

---

## 🐛 Why This Happened

### Historical Context:

1. **Old Nx Configuration**: Earlier versions of the project used `dist/jouster/browser/`
2. **Nx Update**: When Nx was updated, the output path changed to `dist/apps/jouster-ui/browser/`
3. **Workflow Not Updated**: The GitHub Actions workflow still referenced the old path
4. **No Build Verification**: The workflow didn't check if files existed before syncing

### Prevention:

1. ✅ **Fixed**: Updated all deployment scripts to use correct path
2. **TODO**: Add build verification step to workflow:
   ```yaml
   - name: Verify build output
     run: |
       if [ ! -d "dist/apps/jouster-ui/browser" ]; then
         echo "❌ Build output not found!"
         exit 1
       fi
       echo "✅ Build output verified"
   ```

3. **TODO**: Add file count check:
   ```yaml
   - name: Verify files to deploy
     run: |
       FILE_COUNT=$(find dist/apps/jouster-ui/browser -type f | wc -l)
       if [ $FILE_COUNT -lt 10 ]; then
         echo "❌ Too few files to deploy: $FILE_COUNT"
         exit 1
       fi
       echo "✅ Found $FILE_COUNT files to deploy"
   ```

---

## 🎯 Current Status

| Item | Status | Notes |
|------|--------|-------|
| Root cause identified | ✅ | Build path mismatch |
| Workflow fixed | ✅ | staging-deploy.yml updated |
| Local script fixed | ✅ | deploy-staging.bat updated |
| Fixes committed | ✅ | Ready to push |
| Manual deployment | 🔄 | Running via npm script |
| Staging verification | ⏳ | Pending deployment completion |
| Push fixes to main | ⏳ | After manual deployment success |
| Re-run automated workflow | ⏳ | After pushing fixes |

---

## 📞 If Manual Deployment Fails

### Common Issues:

**Issue 1: AWS Credentials**
```cmd
REM Check credentials
aws sts get-caller-identity

REM If fails, configure
aws configure
```

**Issue 2: Build Fails**
```cmd
REM Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build:prod
```

**Issue 3: S3 Permissions**
```cmd
REM Check bucket exists
aws s3 ls s3://stg.jouster.org

REM Check bucket policy
aws s3api get-bucket-policy --bucket stg.jouster.org
```

**Issue 4: Wrong Build Output**
```cmd
REM Check what was actually built
dir /s /b dist

REM Should see dist\apps\jouster-ui\browser\
```

---

## ✅ Summary

**Problem**: Staging deployment failed due to incorrect build path  
**Root Cause**: Workflow used old path `dist/jouster/browser/` instead of `dist/apps/jouster-ui/browser/`  
**Fix Applied**: Updated both workflow and local script  
**Current Action**: Manual deployment running  
**Next Step**: Verify deployment, then push fixes to trigger automated workflow

---

*Created: November 11, 2025 at ~9:30 PM*  
*Fixes applied and manual deployment initiated*  
*Estimated completion: ~9:35 PM*

