# Preview Deployment Troubleshooting Guide

## Current Issue: Build Timeout (October 12, 2025) - RESOLVED

### Problem (SOLVED)
The Angular build for `jouster-ui` was timing out after 12 minutes in GitHub Actions CI environment.

**ROOT CAUSE IDENTIFIED:**
When using `--ignore-scripts` to avoid npm timeout, Nx modules are not properly installed, causing the build to fail with:
```
NX   Could not find Nx modules at "/home/runner/work/Jouster/Jouster".
Have you run npm/yarn install?
```

### Local Build Test Results
- ✅ **Build time locally**: 16.7 seconds
- ✅ **Build command**: `npx nx build jouster-ui --configuration=development --verbose`
- ✅ **Result**: Successful, outputs 1.41 MB initial bundle + lazy chunks

**Conclusion**: The build itself works perfectly. The issue is that `--ignore-scripts` prevents Nx from being properly installed, so the build can't run at all in CI.

### Timeline of Issues Encountered

1. **npm install timeout** - Nx post-install script hanging
   - **Attempted Solution**: Use `--ignore-scripts` flag
   - **Status**: ❌ This breaks Nx installation

2. **ESLint module error** - `angular-eslint` package missing
   - **Solution**: Created custom eslint config using `@angular-eslint/*` packages
   - **Status**: ✅ Fixed

3. **S3 bucket naming error** - Invalid bucket name
   - **Solution**: Fixed variable reference in workflow
   - **Status**: ✅ Fixed

4. **AWS permission errors** - Missing S3 public access permissions
   - **Solution**: Updated IAM policy and applied to AWS
   - **Status**: ✅ Fixed

5. **Nx initialization timeout** - `npx nx reset` hanging
   - **Solution**: Removed initialization step, disabled Nx daemon
   - **Status**: ✅ Fixed

6. **Build failure** - "Could not find Nx modules"
   - **Root Cause**: Using `--ignore-scripts` prevents Nx post-install from setting up modules
   - **Solution**: Allow npm ci to run normally, accept the post-install time
   - **Status**: ✅ Fixed

### Resolution

The fix is to **allow npm ci to run completely**, including all post-install scripts. Even if the Nx post-install takes 2-3 minutes, it's necessary for the workspace to function. The total time will be:
- npm ci with post-install: ~3-4 minutes
- Build: ~17 seconds
- **Total: ~5 minutes** (well within the 25-minute job timeout)

### Final Workflow Configuration

- **npm install**: Run `npm ci` normally, no `--ignore-scripts`
- **Timeout**: 6 minutes for npm ci (enough time for post-install)
- **Build timeout**: 5 minutes (plenty for a 17-second build)
- **Nx daemon**: Disabled (NX_DAEMON=false)
- **Nx cache**: Disabled (--skip-nx-cache)

### Lessons Learned

1. **Don't skip npm post-install scripts** - They're required for proper package setup
2. **Test locally first** - A 17-second local build shouldn't take 12 minutes in CI
3. **Read the actual error messages** - The "Could not find Nx modules" error revealed the true problem
4. **CI timeouts are acceptable** - A 3-4 minute npm install is normal and necessary
