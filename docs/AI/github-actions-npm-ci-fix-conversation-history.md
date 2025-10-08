# GitHub Actions npm ci Hanging Issue - Conversation History

**Date:** October 8, 2025  
**Issue:** GitHub Actions hanging for 1h 40m on npm ci step  
**Status:** ONGOING - Multiple issues identified and addressed

## Problem Summary

GitHub Actions were hanging indefinitely (1h 40m+) during the npm ci installation step, preventing any deployments from completing. Issue evolved through multiple phases requiring different solutions.

## Root Cause Analysis

Through systematic debugging, we identified multiple dependency conflicts in package.json:

### 1. Initial Issue: Duplicate @swc-node/register
- **Problem:** @swc-node/register appeared in devDependencies, overrides, AND resolutions sections
- **Solution:** Removed duplicates from overrides and resolutions sections

### 2. Critical Issue: Conflicting resolutions vs overrides
- **Problem:** package.json had both `resolutions` (Yarn) and `overrides` (npm) with identical content
- **Impact:** npm couldn't resolve dependencies, causing infinite hang
- **Solution:** Removed entire resolutions section since project uses npm

### 3. Most Critical: Duplicate Angular Dependencies  
- **Problem:** Angular packages (@angular/*) were listed in BOTH dependencies AND overrides
- **Impact:** Created circular dependency resolution loop causing npm ci to hang for hours
- **Solution:** Removed Angular packages from overrides, kept only build tools

## Technical Details

### Original package.json Issues:
```json
{
  "dependencies": {
    "@angular/core": "18.2.14",     // ✓ Correct location
    // ... other Angular packages
  },
  "overrides": {
    "@angular/core": "18.2.14",     // ❌ DUPLICATE - causing hang
    // ... same Angular packages duplicated
  },
  "resolutions": {
    "@angular/core": "18.2.14",     // ❌ Yarn-specific, conflicts with overrides
    // ... identical to overrides
  }
}
```

### Fixed package.json:
```json
{
  "dependencies": {
    "@angular/core": "18.2.14",     // ✓ Angular packages here
    // ... other Angular packages
  },
  "overrides": {
    "@angular-devkit/build-angular": "18.2.14",  // ✓ Only build tools
    "typescript": "5.4.5",
    "@swc/core": "~1.7.26",
    "esbuild": "0.23.0"
  }
  // ✓ No resolutions section (removed)
}
```

## Solutions Implemented

### 1. Debug CI Workflow Created
- Split monolithic CI job into isolated jobs with timeouts
- Added comprehensive logging and error handling
- Implemented fallback strategies for npm installation
- Created timeout protection (10min max for npm operations)

### 2. Package.json Fixes Applied
- Removed duplicate Angular dependencies from overrides
- Removed entire resolutions section 
- Cleaned up @swc-node/register duplicates
- Kept only necessary build tool overrides

### 3. Enhanced npm Handling
- Added aggressive cache clearing
- Configured npm timeout settings
- Implemented fallback to `npm install` if `npm ci` hangs
- Added `--legacy-peer-deps` and `--force` fallbacks

## Performance Impact

**Before Fix:**
- npm ci: Hung indefinitely (1h 40m+ timeout)
- GitHub Actions: Failed to complete any deployments
- Local npm install: Also experienced hanging issues

**After Fix:**
- npm ci: Completes in ~30 seconds
- GitHub Actions: Should progress through all steps
- Local npm install: Completes successfully with minor peer dependency warnings

## Status: ONGOING RESOLUTION ⚠️

The critical npm ci hanging issue has been partially resolved, but new issues emerged:

### Phase 4: Massive Dependency Tree Discovery (Latest)
- **New Problem:** Even after fixing duplicates, npm ci continued hanging (10+ minutes)
- **Root Cause:** npm audit revealed 2,024 total dependencies (2,010 dev dependencies)  
- **Impact:** npm ci struggles with complex dependency resolution at this scale
- **Solution:** Switched from npm ci to npm install as primary method with enhanced timeouts

### Performance Analysis:
**Dependency Scale:**
- Total dependencies: 2,024
- Dev dependencies: 2,010 
- Production dependencies: 15
- Security vulnerabilities: 15 (6 low, 9 moderate)

**Latest Fix Applied:**
- Replaced npm ci with npm install (more robust for large trees)
- Added 10-minute timeout with fallback strategies
- Enhanced error recovery with --legacy-peer-deps and --force flags
- Clear node_modules before installation to avoid conflicts

### Current Issue (October 8, 2025):
**Problem:** GitHub Actions now taking 25+ minutes and manually stopped
- Previous successful runs completed much faster
- Need to analyze what changed to cause 25+ minute duration
- May need further optimization or different approach

### Next Investigation Required:
1. Compare last successful run with current failing run
2. Identify what changed between successful and 25+ minute runs
3. Optimize CI workflow for the massive dependency tree
4. Consider dependency reduction strategies

## Files Modified (Updated List)

1. **package.json** - Multiple fixes for duplicate dependencies
2. **.github/workflows/ci-debug.yml** - Enhanced CI with multiple iterations
3. **package-lock.json** - Regenerated to sync with package.json changes
4. **docs/AI/github-actions-npm-ci-fix-conversation-history.md** - This documentation
5. **Multiple .bat files** - Deployment and debugging scripts

## Lessons Learned (Expanded)

1. **Dependency Conflicts:** Having packages in multiple sections creates circular resolution
2. **npm vs Yarn:** Don't mix `overrides` and `resolutions` in the same project  
3. **Scale Matters:** 2,024+ dependencies require different installation strategies
4. **CI Debugging:** Isolate jobs and add timeouts to identify hanging steps
5. **Lock File Sync:** package-lock.json must stay in sync with package.json changes
6. **Installation Method:** npm install may be more robust than npm ci for large projects

## Optimization Opportunities

1. **Dependency Reduction:** Review if all 2,010 dev dependencies are necessary
2. **Workspace Optimization:** Consider splitting large monorepo into smaller workspaces
3. **Caching Strategy:** Implement better npm caching in GitHub Actions
4. **Alternative Tools:** Consider pnpm or yarn for better performance with large trees
5. **Selective Installation:** Install only required dependencies for specific CI jobs
