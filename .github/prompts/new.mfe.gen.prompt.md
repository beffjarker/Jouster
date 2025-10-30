# Generate New MFE Application

This prompt will guide you through generating a complete Angular Micro Frontend (MFE) application with all supporting libraries, followed by validation and testing.

## Step 1: Gather Requirements

I need the following information to generate your MFE application:

1. **MFE App Name** (kebab-case, e.g., `my-account-widget`, `user-profile-app`):

   - What is the name of your MFE application?

**Note**: The generator will use the following defaults:

- **Host Application**: `rs-frontend`
- **Stylesheet Format**: `scss`

## Step 2: Generate MFE Application

Once I have the MFE app name, I'll run the MFE generator with defaults:

```bash
npx nx g ./libs/platform/utils:mfe-app-rscom --mfeAppName=[MFE_APP_NAME] --host=rs-frontend --style=scss
```

This generator creates:

- `libs/[mfeAppName]/shell` - Shell library with routing and components
- `libs/[mfeAppName]/domain` - Domain types and constants
- `libs/[mfeAppName]/services` - Data access services
- `apps/[mfeAppName]` - Main MFE application

## Step 3: Validation Process

After generation completes, I'll validate the created applications and libraries:

### 3.1 Build Validation

I'll first ensure all generated projects build successfully:

```bash
# Build the main MFE application
npx nx build [MFE_APP_NAME]

# Build all supporting libraries
npx nx build [MFE_APP_NAME]-shell
npx nx build [MFE_APP_NAME]-domain
npx nx build [MFE_APP_NAME]-services
```

### 3.2 Linting Validation

I'll run linting for all generated projects:

```bash
# Lint the main MFE application
npx nx lint [MFE_APP_NAME]

# Lint all supporting libraries
npx nx lint [MFE_APP_NAME]-shell
npx nx lint [MFE_APP_NAME]-domain
npx nx lint [MFE_APP_NAME]-services
```

### 3.3 Unit Test Validation

I'll run unit tests with coverage for all projects:

```bash
# Test the main MFE application
npx nx test [MFE_APP_NAME] --coverage

# Test all supporting libraries
npx nx test [MFE_APP_NAME]-shell --coverage
npx nx test [MFE_APP_NAME]-domain --coverage
npx nx test [MFE_APP_NAME]-services --coverage
```

## Step 4: Manual Testing

### 4.1 Start the Host Application

I'll start the host application for manual testing:

```bash
npx nx serve rs-frontend
```

**⏸️ PAUSE HERE - WAITING FOR USER INPUT**: The build process will take approximately 8 minutes to complete. I will NOT proceed automatically or poll for completion. I need YOU to tell me when the build finishes.

Please watch the terminal output and when you see the message indicating the application is ready (typically showing "✓ Compiled successfully"), respond with "build finished" or "ready to continue" so I can proceed with the next steps.

### 4.2 User Testing Instructions

**Important**: When the homepage loads at `http://localhost:4200`, please ensure you **login first** before proceeding with MFE testing.

### 4.3 Test Your MFE

After logging in, visit your MFE route:

- Navigate to: `http://localhost:4200/[MFE_APP_NAME]`
- This is the default route automatically set up by the generator
- Verify the MFE loads correctly and displays the shell component

## Step 5: Next Steps

Once validation is complete, your MFE is ready for development:

### Adding Routes

Add new routes in: `libs/[mfeAppName]/shell/src/lib/lib.routes.ts`

Example:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shell.component').then((m) => m.ShellComponent),
    children: [
      // Add your feature routes here
      {
        path: 'feature1',
        loadComponent: () =>
          import('./components/feature1.component').then(
            (m) => m.Feature1Component
          ),
      },
    ],
  },
];
```

### Adding Feature Components

Create feature components in: `libs/[mfeAppName]/shell/src/lib/components/`

### Adding Services

Add data services in: `libs/[mfeAppName]/services/src/lib/`

### Adding Domain Types

Add types and constants in: `libs/[mfeAppName]/domain/src/lib/`

## Troubleshooting

If you encounter issues:

1. **Build Errors**: Run `npx nx build [MFE_APP_NAME]` to check for compilation issues
2. **Module Federation Issues**: Verify the host app's `module-federation.config.js` includes your MFE
3. **Routing Issues**: Check that routes are properly configured in both the shell library and host app
4. **Port Conflicts**: The generator automatically assigns available ports starting from 4213

## Summary

Your MFE ecosystem is now complete with:

- ✅ Main MFE application with module federation
- ✅ Shell library for routing and components
- ✅ Domain library for types and constants
- ✅ Services library for data access
- ✅ Validated with linting and unit tests
- ✅ Integrated with host application
- ✅ Ready for feature development

You can now start building your MFE features using the generated libraries and following the established patterns.
