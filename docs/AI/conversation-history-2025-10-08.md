# Conversation History - October 8, 2025

## Current Status - October 13, 2025 Update
- ✅ **Preview deployment workflow is now fully functional end-to-end!**
- ✅ Completely removed Nx from the project - now using pure Angular CLI
- ✅ Fixed npm Rollup optional dependency installation issues
- ✅ Resolved S3 deployment path issue (Angular browser subdirectory)
- ✅ Application successfully builds and deploys to AWS S3
- ✅ Preview environment accessible and working at http://jouster-preview-pr-5.s3-website-us-west-2.amazonaws.com

## Recent Changes Made

### October 13, 2025 - Nx Removal & Successful Preview Deployment 🎉
1. **Completely Removed Nx from the Project**
   - Removed all `@nx/*` packages from dependencies
   - Deleted `nx.json` and all Nx-specific configuration files
   - Removed all `project.json` files from apps and libs
   - Converted to pure Angular CLI with `angular.json` workspace configuration
   - Removed `jest.config.ts` (Nx-specific Jest setup)
   - Removed all GitHub Actions workflows except `preview-deploy.yml` for testing
   - **Benefits**: 
     - Installation time reduced from 30+ minutes (hanging) to ~5-8 minutes
     - Build time reduced to ~1-2 minutes
     - Simpler, more maintainable configuration
     - No more post-install script hangs

2. **Fixed ESLint Configuration for Angular CLI**
   - Removed `@nx/eslint-plugin` from `apps/jouster-ui/eslint.config.cjs`
   - Removed `@nx/eslint-plugin` from `apps/jouster-ui-e2e/eslint.config.cjs`
   - Converted to pure `@angular-eslint` and `typescript-eslint` configuration
   - Updated e2e eslint to use only `eslint-plugin-cypress`
   - All linting now works without Nx dependencies

3. **Fixed Cypress Configuration**
   - Removed `@nx/cypress/plugins/cypress-preset` from `apps/jouster-ui-e2e/cypress.config.ts`
   - Removed Nx preset from `e2e/cypress.config.ts`
   - Converted to standard Cypress configuration
   - Cypress tests now independent of Nx

4. **Fixed npm Rollup Optional Dependency Issue**
   - **Problem**: `@rollup/rollup-linux-x64-gnu` not installing in CI due to npm bug
   - **Root Cause**: npm cache in GitHub Actions was restoring corrupted node_modules
   - **Solution**: 
     - Removed `cache: 'npm'` from setup-node action
     - Added explicit deletion of `package-lock.json` and `node_modules` before install
     - Changed from `npm ci` to `npm install` for proper optional dependency handling
   - **Result**: Rollup binaries now install correctly, Angular builds succeed

5. **Fixed S3 Deployment Path Issue**
   - **Problem**: Preview deployed but showed 404 error for index.html
   - **Root Cause**: Angular outputs to `dist/jouster-ui/browser/` but workflow synced from `dist/jouster-ui/`
   - **Solution**: Updated S3 sync path to `dist/jouster-ui/browser/`
   - **Result**: All files including index.html now properly deployed to S3

6. **Fixed AWS S3 Public Access Block Issue**
   - **Problem**: AccessDenied when applying bucket policy due to block public access
   - **Solution**: Added step to remove block public access settings before applying policy
   - **Result**: Buckets now properly configured for public website hosting

### October 12, 2025 - Preview Deployment Fixes
1. **Fixed ESLint Configuration Issue**
   - Removed redundant `angular-eslint` meta-package dependency
   - Modified `apps/jouster-ui/eslint.config.cjs` to directly use `@angular-eslint/*` scoped packages
   - Nx's built-in Angular config was requiring the meta-package; replaced with custom configuration
   - Linting now works with only the scoped packages we already had installed

2. **Fixed npm Installation Timeout**
   - Added `--ignore-scripts` flag to skip problematic Nx post-install hooks
   - Nx post-install script was hanging indefinitely in GitHub Actions CI environment
   - Reduced timeout to 180 seconds (3 minutes) for first attempt
   - Added environment variables: `NX_SKIP_NX_CACHE=true` and `CI=true`
   - Installation now completes in under 3 minutes instead of timing out after 10+

3. **Fixed S3 Bucket Name Bug**
   - Preview deployment workflow had incorrect variable reference: `${{ steps.pr.outputs.number }}`
   - Changed to correct reference: `${{ steps.preview-name.outputs.bucket_name }}`
   - Bucket names now generate correctly as `jouster-preview-pr-{number}`

4. **Fixed AWS IAM Permissions**
   - Added missing S3 public access block permissions to `GitHubActionsPreviewPolicy`:
     - `s3:DeletePublicAccessBlock`
     - `s3:PutBucketPublicAccessBlock`
     - `s3:GetBucketPublicAccessBlock`
     - `s3:DeleteBucketPublicAccessBlock`
   - Created helper scripts to update the policy:
     - `aws/scripts/update-preview-policy.bat` (Windows)
     - `aws/scripts/update-preview-policy.sh` (Linux/Mac)
   - Policy successfully updated to version v2 in AWS IAM
   - Preview deployments can now modify bucket public access settings

5. **Added Missing ESLint Plugins**
   - Added `eslint-plugin-import` to resolve import plugin errors
   - Added `eslint-plugin-cypress` for e2e test linting
   - Added `@angular-eslint/*` packages for Angular-specific rules

### Earlier Changes (October 8, 2025)
1. Updated tslib dependency from 2.6.2 to 2.6.3
2. Modified GitHub Actions workflow to use timeout protection
3. Added dependency installation fallback strategies
4. Removed problematic overrides in package.json

## Problems Solved

### ✅ npm Installation Timeout
- **Root Cause**: Nx post-install script hanging in CI environment
- **Solution**: Use `--ignore-scripts` flag to skip post-install hooks
- **Result**: Installation completes in ~3 minutes instead of timing out

### ✅ ESLint Module Not Found Error
- **Error**: `Cannot find module 'angular-eslint'`
- **Root Cause**: Nx eslint plugin expecting `angular-eslint` meta-package
- **Solution**: Created custom eslint config using `@angular-eslint/*` packages directly
- **Result**: Linting works without redundant meta-package

### ✅ S3 Bucket Creation Failure
- **Error**: `The specified bucket is not valid` - bucket name was "jouster-preview-pr-"
- **Root Cause**: Incorrect variable reference in workflow
- **Solution**: Fixed reference to use correct step output
- **Result**: Buckets now created with valid names like "jouster-preview-pr-5"

### ✅ AWS Permission Denied Errors
- **Error**: `s3:PutBucketPublicAccessBlock` permission denied
- **Root Cause**: IAM policy missing bucket-level public access permissions
- **Solution**: Updated IAM policy with missing permissions and applied to AWS
- **Result**: Preview deployments can now configure bucket public access settings

## Files Modified

### Configuration Files
- `apps/jouster-ui/eslint.config.cjs` - Custom Angular ESLint configuration
- `.github/workflows/preview-deploy.yml` - Fixed installation and S3 bucket creation

### Package Management
- `package.json` - Added ESLint plugins, removed angular-eslint meta-package
- `package-lock.json` - Updated with new dependencies

### AWS Infrastructure
- `aws/policies/github-actions-preview-policy.json` - Added S3 public access permissions
- `aws/policies/README-PREVIEW-POLICY-UPDATE.md` - Documentation for policy update
- `aws/scripts/update-preview-policy.bat` - Windows script to update IAM policy
- `aws/scripts/update-preview-policy.sh` - Linux/Mac script to update IAM policy

## Commits Made

### October 13, 2025 - Nx Removal & Preview Deployment Success
1. `fefe7ed` - fix: use npx ng instead of ng in deploy-preview workflow
2. `ca6f3cd` - feat: remove Nx entirely, convert to Angular CLI - fixes CI/CD timeouts
3. `5a7446c` - fix: remove remaining Nx references and handle Rollup optional dependency issue
4. `e19abc8` - fix(ci): use npm install instead of npm ci to properly handle Rollup optional dependencies
5. `[latest]` - fix(ci): remove npm cache and force clean install to fix Rollup optional dependencies
6. `[latest]` - fix(ci): remove block public access settings before applying S3 bucket policy
7. `[latest]` - fix(ci): sync S3 deployment from correct Angular build output directory

### October 12, 2025 - Preview Deployment Fixes
1. `26e9b18` - fix(deps): add missing eslint and cypress plugins to resolve build failures
2. `58a2a48` - fix(eslint): use @angular-eslint packages directly instead of meta-package
3. `dc0a06d` - fix(ci): correct S3 bucket name reference in preview deployment
4. `2240232` - fix(ci): skip npm post-install scripts to prevent timeout in preview deployment
5. `085ccc9` - fix(aws): add missing S3 public access block permissions to preview IAM policy

## Definition of "Done"
- [x] Code builds successfully locally and in CI
- [x] ESLint passes without errors
- [x] Dependencies install within reasonable timeframe (<8 minutes)
- [x] AWS IAM permissions configured correctly
- [x] Preview deployment workflow functional end-to-end
- [x] Application accessible at preview URL
- [x] All temporary files cleaned up
- [ ] Unit tests pass (to be verified)
- [ ] Cypress e2e tests pass (to be verified)

## Next Steps
1. ✅ ~~Monitor the current GitHub Actions preview deployment run~~ - **COMPLETED**
2. ✅ ~~Verify preview environment deploys successfully to S3~~ - **COMPLETED**
3. ✅ ~~Test the preview URL to ensure the application loads correctly~~ - **COMPLETED**
4. Run unit tests locally and in CI
5. Run Cypress e2e tests locally and in CI
6. Consider re-adding other GitHub Actions workflows (build, test, deploy to production)
7. If all tests pass, merge PR to develop branch
8. Document lessons learned about Nx removal for future reference

## Accomplishments

### October 13, 2025
- ✅ **Successfully removed Nx entirely from the project**
  - Eliminated 30+ minute installation hangs
  - Reduced build time from unpredictable to ~1-2 minutes
  - Simplified configuration significantly
- ✅ **Fixed npm Rollup optional dependency bug**
  - Identified npm cache as the root cause
  - Implemented clean install strategy without cache
- ✅ **Fixed S3 deployment path for Angular's browser output**
- ✅ **Configured S3 buckets for public website hosting**
- ✅ **Successfully deployed preview environment to AWS**
- ✅ **Verified application loads correctly in browser**
- ✅ **Cleaned up all temporary files**
- ✅ **Updated conversation history documentation**

### October 12, 2025
- ✅ Identified and fixed npm installation timeout issue
- ✅ Resolved ESLint configuration without adding redundant packages
- ✅ Fixed S3 bucket naming bug in preview workflow
- ✅ Updated AWS IAM policy with correct permissions
- ✅ Applied IAM policy changes to AWS account
- ✅ Created helper scripts and documentation for future policy updates
- ✅ Maintained clean dependency tree without unnecessary meta-packages
