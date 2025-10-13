# Preview Deployment Troubleshooting Guide

## Current Issue: Build Timeout (October 12, 2025)

### Problem
The Angular build for `jouster-ui` is timing out after 12 minutes in GitHub Actions CI environment.

```
npx nx build jouster-ui --configuration=development --skip-nx-cache --verbose
```

This is hanging indefinitely even with:
- `NX_DAEMON=false` - Daemon disabled
- `NODE_OPTIONS: --max_old_space_size=4096` - 4GB memory allocated
- 12-minute timeout

### Timeline of Issues Encountered

1. **npm install timeout** - Nx post-install script hanging
   - **Solution**: Use `--ignore-scripts` flag
   - **Status**: ✅ Fixed

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

6. **Build timeout (CURRENT)** - Angular build hanging after 12 minutes
   - **Status**: ⚠️ IN PROGRESS

### Possible Causes

1. **Incomplete dependency installation** - Using `--ignore-scripts` may skip critical build setup
2. **Nx workspace corruption** - Workspace not properly initialized for builds
3. **Angular build hanging** - Could be stuck on a specific step (optimization, bundling, etc.)
4. **GitHub Actions runner limits** - Resource constraints in CI environment
5. **Circular dependency or infinite loop** - In the build process

### Recommended Next Steps

#### Option 1: Test Build Locally
```bash
cd H:\projects\Jouster
npm ci
npx nx build jouster-ui --configuration=development --verbose
```

Time this to see what the expected build time should be. If it completes in 2-3 minutes locally, the CI issue is environment-specific.

#### Option 2: Simplify the Build
Try building with Angular CLI directly instead of through Nx:

```bash
cd apps/jouster-ui
npx ng build --configuration=development
```

#### Option 3: Build with Production Config
The development config might have issues. Try production:

```bash
npx nx build jouster-ui --configuration=production
```

#### Option 4: Check for Specific Hanging Points
Add more verbose logging to see where it hangs:

```bash
NX_VERBOSE_LOGGING=true npx nx build jouster-ui --configuration=development --verbose
```

#### Option 5: Use a Different CI Approach
Consider using a pre-built Docker image with all dependencies, or cache the node_modules between runs.

### Questions to Answer

1. ✅ Does npm install complete successfully? **YES - with fallback to --ignore-scripts**
2. ❓ Does the build work locally? **NEEDS TESTING**
3. ❓ How long does a local build take? **UNKNOWN**
4. ❓ Does the build start at all or hang immediately? **UNKNOWN - need verbose output**
5. ❓ Is Nx required or can we use Angular CLI directly? **POSSIBLE ALTERNATIVE**

### Alternative Deployment Strategy

If the build continues to fail in GitHub Actions, consider:

1. **Build locally and commit dist folder** (not ideal but works)
2. **Use a different CI service** (CircleCI, GitLab CI, etc.)
3. **Use GitHub Actions with self-hosted runner** (more resources/control)
4. **Simplify the build configuration** (remove optimizations, reduce bundle size checks)
5. **Split the build into stages** (compile, then bundle, then optimize)

### Current Workflow Settings

- **Total timeout**: 25 minutes for entire job
- **Install timeout**: 8 minutes
- **Build timeout**: 12 minutes
- **Node version**: 20
- **Memory allocation**: 4GB (max_old_space_size)
- **Nx daemon**: Disabled
- **Nx cache**: Disabled (skip-nx-cache)

### Known Working Configuration (Local)

Document what works locally so we can compare:
- [ ] npm install method: _____________
- [ ] npm install time: _____________
- [ ] Build command: _____________
- [ ] Build time: _____________
- [ ] Total time: _____________

## Resolution Strategy

Since we've fixed 5 different issues already today, we need to determine if this is:
- **A. A fundamental incompatibility** with GitHub Actions free tier resources
- **B. A configuration issue** that can be fixed with the right settings
- **C. A code issue** in the application that causes the build to hang

Next immediate action: **Test the build locally to establish a baseline.**

