---
mode: agent
---

You are tasked with creating a new UWP (Unified Waste Profile) section component for the waste profile wizard. This generator will create a complete section structure following the established patterns in the workspace.

## Required Inputs

1. **title**: The display title for the section (e.g., "Generator Information", "Billing Information")
2. **icon**: The icon identifier for the section (e.g., "hard-hat-solid", "credit-card-solid")
3. **id**: The section identifier used for routing and internal references. **Must match one of the existing section IDs** from the navbar state constants in `/libs/unified-wp-common/domain/src/lib/constants/navbar-state.constants.ts`:
   - **COR sections**: `disposal-facility`, `generator-information`, `generator-certification`, `billing-information`, `wastestream-information`, `waste-stream-characteristics`, `regulatory-information`, `attachments`, `review-and-submit`
   - **SW sections**: `disposal-facility`, `generator-information`, `generator-authorization`, `billing-information`, `wastestream-information`, `RCRA-certification`, `attachments`, `choose-signer`, `review-and-submit`
4. **routePath**: The route path to be used in the URL (e.g., "generator-information", "billing-information", "wastestream-information")
5. **applicationType**: Either "COR" or "SW" to determine which application type this section applies to

## Task Requirements

### 1. Validate Input Requirements

- **Validate the `id` input** against the navbar state constants in `/libs/unified-wp-common/domain/src/lib/constants/navbar-state.constants.ts`
- Ensure the provided `id` exists in the appropriate navbar state based on `applicationType`:
  - For COR: Check `DEFAULT_COR_NAVBAR_STATE` sections
  - For SW: Check `DEFAULT_EXPRESS_SW_NAVBAR_STATE` or `DEFAULT_LONGFROM_SW_NAVBAR_STATE` sections
- If the `id` doesn't match any existing section ID, stop and request a valid ID from the user

### 2. Analyze Existing Structure

- Use semantic search to understand the current section patterns
- Examine both COR and SW section implementations in `/libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/`
- Review the routing structure in `lib.routes.ts`

### 3. Create Section Component Files

Create the following files in the appropriate location based on applicationType:

**For COR sections**: `/libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/cor/sections/{id}/`
**For SW sections**: `/libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/sw/sections/{id}/`

#### Required files:

- `{id}.component.ts` - Main section component extending BaseSection
- `{id}.component.html` - Template following the established pattern
- `{id}.component.scss` - Styles following the established pattern
- `{id}.component.spec.ts` - Unit tests with proper coverage

### 3. Component Implementation Requirements

#### TypeScript Component (`{id}.component.ts`):

- Import required dependencies from Angular and domain libraries
- Use appropriate selector: `digital-platform-{id}`
- Mark as standalone component
- Extend `BaseSection` class
- Set correct `id`, `title`, and `icon` properties
- Use appropriate SectionId type (`CORSectionId` or `SWSectionId`)
- Include proper dependency injection patterns
- Follow established component patterns from existing sections

#### HTML Template (`{id}.component.html`):

- Use the standard waste-profile-section structure
- Include icon and title display with proper Bootstrap classes
- Add form-content container with proper spacing (py-8, d-flex flex-column gap-8)
- Include placeholder for subsection components (to be added later)

#### SCSS Styles (`{id}.component.scss`):

- Follow established naming patterns
- Include comment header identifying the section
- Use consistent styling patterns from other sections
- **Use the standardized form-name styling**:

  ```scss
  .form-name {
    //styleName: Desktop/H3;
    font-family: Open Sans, sans-serif;
    font-size: 32px;
    font-weight: 600;
    line-height: 42px;
    text-align: left;
    text-underline-position: from-font;
    text-decoration-skip-ink: none;

    color: #003763;
  }
  ```

- Ensure proper alignment and spacing

#### Test File (`{id}.component.spec.ts`):

- Create barebones test file structure
- Include basic component creation test only
- Use Spectator for Angular testing (minimal setup)
- Add TODO comments for future test implementation
- Ensure file exists for build compliance but skip comprehensive testing for now

### 4. Update Routes Configuration

Update `/libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/lib.routes.ts`:

- Import the new section component with appropriate alias if needed
- Add the route entry in the correct location based on applicationType:
  - **For COR**: Add to the COR children array (path with `canMatch: [CorProfileGuard]`)
  - **For SW**: Add to the SW children array (path with `canMatch: [SwProfileGuard]`)
- Use the provided `routePath` input as the `path` property in the route configuration
- Use DummySectionComponent initially if no specific component logic is needed yet
- Follow the established routing pattern with proper path matching

### 5. Update Type Definitions (if needed)

If the section id is new and not already defined:

- Update `/libs/unified-wp-common/domain/src/lib/types/sections.ts`
- Add the new section id to the appropriate type union (`CORSectionId` or `SWSectionId`)

### 6. Build Validation

After all changes:

- Run `npx nx run unified-wp:build` to ensure compilation passes
- Fix any TypeScript compilation errors
- Ensure all imports are properly resolved
- Verify that the build completes without errors

### 7. Testing Validation

- Create barebones test files for build compliance
- Skip running tests for now (tests will be implemented later)
- Ensure test files exist and have basic structure to prevent build failures

## Success Criteria

- [ ] Input `id` is validated against existing navbar state constants
- [ ] All required files are created in the correct location
- [ ] Component properly extends BaseSection with correct properties
- [ ] Route is added to the correct section based on applicationType
- [ ] Build passes without compilation errors (`npx nx run unified-wp:build`)
- [ ] Barebones test files created (comprehensive tests to be added later)
- [ ] Code follows established patterns and conventions
- [ ] All imports are properly resolved
- [ ] Section types are updated if necessary

## Example Usage

```
Inputs:
- title: "Waste Stream Information"
- icon: "flask-solid"
- id: "wastestream-information"  // Must match existing navbar state section ID
- routePath: "wastestream-information"
- applicationType: "COR"

Expected outcome:
- Validates that "wastestream-information" exists in DEFAULT_COR_NAVBAR_STATE
- Creates COR section component in `/libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/cor/sections/wastestream-information/`
- Updates routes with new COR route entry using "wastestream-information" as the path
- All files follow established patterns
- Build and tests pass
```

## Notes

- Follow all UWP domain instructions and patterns established in the workspace
- Use semantic search to understand existing implementations before creating new code
- Ensure consistency with existing section patterns
- Prioritize code reuse and follow DRY principles
- All generated code must pass build and test validation
