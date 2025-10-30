---
applyTo: 'apps/unified-wp-e2e/**'
---

# Cypress Testing Guidelines for Unified Waste Profile (UWP)

> **Purpose:**  
> Comprehensive testing patterns for the Unified Waste Profile domain. Extends `cypress-ui.instructions.md` with UWP-specific workflows, custom commands, and waste profiling business logic.

---

## How to Use This File

_Guidelines for effectively applying UWP testing patterns and conventions_

- **Copilot/LLMs:** Use these patterns for all UWP e2e test generation. Always combine with `cypress-ui.instructions.md` for complete guidance. Use semantic search and Nx tools before creating tests.
- **Humans:** Follow for UWP-specific testing patterns. See `uwp.instructions.md` for development context.

---

## Copilot/LLM Usage for UWP Testing

_Best practices for AI-assisted UWP test development and code generation_

- **Always** use semantic search to find existing UWP test patterns before creating new ones
- **Always** check for existing UWP custom commands in `apps/unified-wp-e2e/src/support/commands.ts`
- Use Nx tools for UWP e2e project management and affected testing
- If unsure about UWP domain logic, use semantic search to find examples in existing test files
- Reference `uwp.instructions.md` for UWP development context and domain knowledge
- Always review generated UWP tests for waste profile business logic correctness

---

## Nx Integration for UWP

_Leveraging Nx workspace tools for efficient UWP testing workflows_

- Use Nx affected testing for UWP: `npx nx affected --target=e2e --base=origin/master`
- Reference `.github/instructions/nx.instructions.md` for Nx-specific flows
- Use the Nx MCP server and tools for UWP workspace analysis when available
- Follow Nx conventions for UWP test organization and execution

---

## Quick Reference Checklist

_Essential validation points for every UWP e2e test_

- [ ] Used UWP-specific user sessions (SW, COR, Admin users)
- [ ] Included waste profile API intercepts for data management
- [ ] Used UWP custom commands (`createUwpSwWasteProfile`, `createUwpCorWasteProfile`)
- [ ] Added proper UWP tags (@waste-profile, @sw, @cor, @repository)
- [ ] Tested both SW and COR workflows where applicable
- [ ] Included proper cleanup for created test data

---

## 🎯 **UWP Domain Knowledge**

### User Types & Permissions

_Available test users for different UWP domain workflows_

```typescript
// SW (Special Waste) Users
'automation.sw.user@gmail.com'; // Standard SW user
'swcustomer@gmail.com'; // SW customer user
'swadmin@gmail.com'; // SW admin user

// COR (Customer Owned Resource) Users
'automation.cor.user@gmail.com'; // Standard COR user
'digitalmrautomation+uwp-coruser@gmail.com'; // COR automation user
'coradmin@gmail.com'; // COR admin user

// Combined Users (SW + COR permissions)
'digitalmrautomation+uwp+sw+cor2@republicservices.com'; // Combined user
'automation.admin.user@gmail.com'; // Admin user
```

### Waste Profile Workflow States

_Valid status values for waste profile lifecycle testing_

```typescript
// Waste Profile Statuses
'drafts'; // Profile in draft state
'pendingSignature'; // Awaiting signature
'submitted'; // Submitted for review
'inReview'; // Under review process
'actionNeeded'; // Requires user action
'approved'; // Approved profile
'rejected'; // Rejected profile
'expired'; // Expired profile
```

---

## 📁 **UWP Project Structure**

```
apps/unified-wp-e2e/
├── src/
│   ├── e2e/
│   │   ├── dashboard/               # Dashboard and profile tracker tests
│   │   ├── playground/              # Development navigation tests
│   │   └── waste-profile-repository/
│   │       ├── datatable/           # Data table interactions
│   │       ├── left-side-navigation-panel/
│   │       ├── routing/             # URL and navigation tests
│   │       ├── sign/                # Profile signing workflows
│   │       ├── wp-cancel-signature-request/
│   │       ├── wp-copy-profile/     # Profile copying functionality
│   │       └── wp-delete/           # Profile deletion tests
│   ├── fixtures/
│   │   ├── relative-urls.json       # UWP page navigation
│   │   ├── waste-profile-status-configs.json
│   │   └── waste-profile-repository/
│   └── support/
│       └── commands.ts              # UWP-specific commands
```

---

## 🎯 **UWP-Specific Commands**

### Waste Profile Creation Commands

_Custom Cypress commands for creating test data via API_

```typescript
// Create SW Waste Profile
cy.createUwpSwWasteProfile(
  source: 'sw',
  userType: 'swCustomer' | 'swAdmin',
  status: 'drafts' | 'pendingSignature' | 'submitted'
).then((profileId) => {
  // profileId available for test operations
});

// Create COR Waste Profile
cy.createUwpCorWasteProfile(
  source: 'cor',
  userType: 'cor-automation' | 'coradmin'
).then((wasteFormId) => {
  // wasteFormId available for test operations
});
```

### Navigation Commands

_UWP-specific page navigation utilities_

```typescript
// UWP-specific navigation (extends relative-urls.json)
cy.navigateToPage('Profiling'); // Dashboard/profiling page
cy.navigateToPage('Waste Profile'); // Waste profile home
cy.navigateToPage('Playground'); // Development playground
```

### Common UWP Interactions

_Frequently used element selectors and actions for UWP testing_

```typescript
// Repository Navigation
cy.getAutoId('view-all-profiles').click(); // Go to repository
cy.url().should('include', '/waste-profile-repository');

// Status Filtering
cy.get('[data-automation-id="CategoryListNav-item"][data-id="drafts"]').click();
cy.url().should('include', 'status=drafts');

// Profile Actions
cy.getAutoId('Datatable-expandable-icon-container').first().click();
cy.getAutoId('delete-profile-icon').click();
cy.getAutoId('copy-profile-icon').click();
cy.getAutoId('sign-waste-profile-link').click();
```

---

## ✍️ **UWP Test Patterns**

### Standard UWP Test Structure

_Template structure for comprehensive UWP e2e tests_

```typescript
describe('Waste Profile Feature - SW', () => {
  beforeEach(() => {
    // 1. Authentication with appropriate user type
    cy.session('sw-user-session', () => {
      cy.navigateToPage('Home');
      cy.getAutoId('Login-button').click();
      cy.universalLoginWithCredentials('swcustomer@gmail.com', 'Test1234');
      cy.url().should('not.include', '/login');
    });

    // 2. UWP API Intercepts
    cy.intercept('GET', '**/api/uwp/comp/profiles/list*').as(
      'getWasteProfilesList'
    );
    cy.intercept('GET', '**/api/uwp/comp/profiles/count*').as(
      'getProfileCounts'
    );
    cy.intercept('GET', '**/api/uwp/sw/waste-profiles/*').as(
      'getSwWasteProfile'
    );
  });

  it(
    'should perform waste profile operation',
    {
      tags: ['@waste-profile', '@sw', '@regression', '@CI', '@US123456'],
    },
    () => {
      // 3. Create test data via API
      cy.createUwpSwWasteProfile('sw', 'swCustomer', 'drafts').then(
        (profileId) => {
          // 4. Navigate to repository
          cy.navigateToPage('Waste Profile');
          cy.getAutoId('view-all-profiles').click();
          cy.wait('@getWasteProfilesList');

          // 5. Find and interact with profile
          cy.getAutoId('Datatable-search-input').type(profileId);
          cy.getAutoId('Datatable-search-button').click();

          // 6. Perform operations and assertions
          cy.getAutoId('Datatable-expandable-icon-container').first().click();
          cy.getAutoId('profile-action').should('be.visible');
        }
      );
    }
  );
});
```

### Multi-User Workflow Pattern

_Testing cross-domain workflows between SW and COR users_

```typescript
describe('Waste Profile Cross-User Workflow', () => {
  it(
    'should handle SW to COR workflow',
    {
      tags: ['@waste-profile', '@sw', '@cor', '@workflow', '@US123456'],
    },
    () => {
      // Step 1: SW User creates profile
      cy.session('sw-user', () => {
        cy.universalLoginWithCredentials('swcustomer@gmail.com', 'Test1234');
      });

      cy.createUwpSwWasteProfile('sw', 'swCustomer', 'submitted').then(
        (profileId) => {
          // Step 2: COR User reviews profile
          cy.session('cor-user', () => {
            cy.universalLoginWithCredentials('coradmin@gmail.com', 'Test1234!');
          });

          cy.navigateToPage('Waste Profile');
          // Continue with COR user actions...
        }
      );
    }
  );
});
```

---

## 🔧 **UWP Testing Patterns**

### Profile Repository Testing

_Patterns for testing waste profile repository functionality_

```typescript
// Navigate to repository and wait for data
cy.navigateToPage('Profiling');
cy.getAutoId('view-all-profiles').click();
cy.url().should('include', '/waste-profile-repository');
cy.wait('@getWasteProfilesList');
cy.wait('@getProfileCounts');

// Filter by status
cy.get('[data-automation-id="CategoryListNav-item"]')
  .contains('Drafts')
  .click();
cy.url().should('include', 'status=drafts');

// Search for specific profile
cy.getAutoId('Datatable-search-input').type(profileId);
cy.getAutoId('Datatable-search-button').click();

// Expand profile details
cy.getAutoId('Datatable-expandable-icon-container')
  .first()
  .click({ force: true });
cy.getAutoId('Datatable-expanded-detail').should('be.visible');
```

### Profile Actions Testing

_Testing profile operations like delete, copy, and sign workflows_

```typescript
// Delete profile workflow
cy.getAutoId('delete-profile-icon').click();
cy.getAutoId('modal-confirm-button').click();
cy.wait('@deleteWasteProfile');
cy.getAutoId('toast-message-success')
  .should('be.visible')
  .and('contain', 'Profile successfully deleted');

// Copy profile workflow
cy.getAutoId('copy-profile-icon').click();
cy.wait('@copyProfile').then((interception) => {
  expect(interception.response.statusCode).to.eq(200);
  // Verify new profile created with "Copy of" prefix
});

// Sign profile workflow
cy.getAutoId('sign-waste-profile-link').click();
cy.url().should('include', '/edit/review-and-submit');
```

### Dashboard Testing

_Testing waste profile dashboard and tracker functionality_

```typescript
// Profile tracker validation
cy.navigateToPage('Profiling');
cy.getAutoId('title').should('be.visible');
cy.getAutoId('Action Needed').should('contain', 'Action Needed');
cy.getAutoId('Drafts').should('contain', 'Drafts');
cy.getAutoId('Pending Signature').should('contain', 'Pending Signature');

// Click on status cards
cy.getAutoId('Drafts').click();
cy.url().should('include', 'status=drafts');
```

---

## 🧪 **API Mocking for UWP**

### Common UWP API Intercepts

_Essential API mocking patterns for UWP testing_

```typescript
// Profile list and counts
cy.intercept('GET', '**/api/uwp/comp/profiles/list*').as(
  'getWasteProfilesList'
);
cy.intercept('GET', '**/api/uwp/comp/profiles/count*').as('getProfileCounts');

// Profile details by source
cy.intercept('GET', '**/api/uwp/sw/waste-profiles/*').as('getSwWasteProfile');
cy.intercept('GET', '**/api/uwp/cor/waste-profile/details*').as(
  'getCorWasteProfile'
);

// Profile actions
cy.intercept('GET', '**/api/uwp/sw/waste-profile/action?**').as(
  'swProfileAction'
);
cy.intercept('GET', '**/api/uwp/cor/waste-profile/action?**').as(
  'corProfileAction'
);
cy.intercept('POST', '**/api/uwp/sw/copy*').as('copySwProfile');
cy.intercept('POST', '**/api/uwp/cor/copy*').as('copyCorProfile');
```

### Mock Profile Data

_Example mock responses for UWP API testing_

```typescript
// Mock waste profile list response
cy.intercept('GET', '**/api/uwp/comp/profiles/list*', (req) => {
  req.reply({
    statusCode: 200,
    body: {
      status: 'success',
      message: 'Waste profiles retrieved successfully',
      wasteProfiles: [
        {
          id: 'WP-TEST-001',
          source: 'SW',
          status: 'Draft',
          generatorName: 'Test Generator',
          updatedOn: '2024-01-01T00:00:00Z',
        },
      ],
    },
  });
}).as('getMockProfiles');
```

---

## 📊 **Fixtures & Test Data**

### Relative URLs for UWP

_Page navigation paths for UWP domain testing_

```json
{
  "Home": "/",
  "Profiling": "/profiling",
  "Waste Profile": "/profiling/waste-profile",
  "Playground": "/profiling/playground"
}
```

### Waste Profile Status Configurations

_Status definitions and metadata for waste profile testing_

```json
{
  "statuses": [
    {
      "key": "drafts",
      "label": "Drafts",
      "description": "Profiles in draft state"
    },
    {
      "key": "pendingSignature",
      "label": "Pending Signature",
      "description": "Awaiting customer signature"
    }
  ]
}
```

---

## 🆘 **UWP-Specific Troubleshooting**

### Common Issues

_Troubleshooting guide for frequent UWP testing problems_

**Profile Not Found After Creation:**

```typescript
// ❌ Immediate search without waiting
cy.createUwpSwWasteProfile().then((profileId) => {
  cy.getAutoId('Datatable-search-input').type(profileId);
});

// ✅ Wait for API responses first
cy.createUwpSwWasteProfile().then((profileId) => {
  cy.wait('@getWasteProfilesList');
  cy.getAutoId('Datatable-search-input').type(profileId);
});
```

**User Permission Issues:**

```typescript
// ❌ Wrong user type for operation
cy.session('sw-user', () => {
  cy.universalLoginWithCredentials('swcustomer@gmail.com', 'Test1234');
});
// Then trying to access COR-only features

// ✅ Use appropriate user for domain
cy.session('cor-user', () => {
  cy.universalLoginWithCredentials('coradmin@gmail.com', 'Test1234!');
});
```

**Modal and Toast Interactions:**

```typescript
// Wait for modal to appear before interacting
cy.getAutoId('delete-profile-icon').click();
cy.getAutoId('modal-confirm-button').should('be.visible').click();

// Verify toast messages and handle dismissal
cy.getAutoId('toast-message-success').should('be.visible');
cy.getAutoId('toast-close-button-success').click();
cy.getAutoId('toast-success').should('not.exist');
```

---

## 🎯 **Quick UWP Test Templates**

### Profile Creation & Deletion

_Basic CRUD operations testing template_

```typescript
it(
  'should create and delete SW waste profile',
  {
    tags: ['@waste-profile', '@sw', '@regression'],
  },
  () => {
    cy.createUwpSwWasteProfile('sw', 'swCustomer', 'drafts').then(
      (profileId) => {
        cy.navigateToPage('Waste Profile');
        cy.getAutoId('view-all-profiles').click();
        cy.wait('@getWasteProfilesList');

        // Search and delete
        cy.getAutoId('Datatable-search-input').type(profileId);
        cy.getAutoId('Datatable-search-button').click();
        cy.getAutoId('Datatable-expandable-icon-container').first().click();
        cy.getAutoId('delete-profile-icon').click();
        cy.getAutoId('modal-confirm-button').click();

        cy.getAutoId('toast-message-success').should('be.visible');
      }
    );
  }
);
```

### Profile Repository Navigation

_Testing repository status filtering and navigation_

```typescript
it(
  'should navigate repository status tabs',
  {
    tags: ['@waste-profile', '@repository', '@navigation'],
  },
  () => {
    cy.navigateToPage('Waste Profile');
    cy.getAutoId('view-all-profiles').click();
    cy.wait('@getProfileCounts');

    // Test each status tab
    ['drafts', 'pendingSignature', 'submitted'].forEach((status) => {
      cy.get(
        `[data-automation-id="CategoryListNav-item"][data-id="${status}"]`
      ).click();
      cy.url().should('include', `status=${status}`);
    });
  }
);
```

---

---

## Common Pitfalls & Anti-Patterns for UWP

_Critical mistakes to avoid in UWP testing_

- **Never** duplicate UWP domain logic; always check for reusable patterns in existing UWP tests
- **Never** mix SW and COR test logic in the same test file; keep domain separation clear
- **Never** create waste profiles without proper cleanup; use API creation commands that handle cleanup
- **Never** hardcode waste profile IDs; always use the values returned from creation commands
- **Never** skip API intercepts for UWP endpoints; they're critical for test reliability

---

## Copilot/LLM Live UWP Testing Workflow

_Step-by-step workflow for AI-assisted UWP test development_

When working with UWP e2e tests in agent mode:

1. **Understand the UWP domain**: Review waste profile workflows and user types
2. **Generate tests** following UWP-specific patterns from this file
3. **Run UWP tests locally**: `npx nx e2e unified-wp-e2e`
4. **Fix any UWP business logic failures** before considering the task complete
5. **Validate UWP test data cleanup** to avoid test pollution
6. **Use UWP affected testing**: Focus on waste profile related changes

After any logical set of UWP test changes, ensure all tests pass before considering implementation complete. Pay special attention to waste profile state transitions and user permission boundaries.

## Summary

_Key takeaways for effective UWP testing_

This file provides **UWP-specific patterns** for comprehensive waste profile testing. Always combine with `cypress-ui.instructions.md` for complete testing guidance.

**Key UWP Testing Principles:**

- Use appropriate user types for SW/COR domains
- Always wait for API responses before interactions
- Test both creation and cleanup workflows
- Include proper error handling and edge cases
- Use domain-specific tags for test organization
