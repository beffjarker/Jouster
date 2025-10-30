---
applyTo: 'libs/unified-wp*/**,apps/uwp*/**,apps/unified-wp*/**'
---

# Unified WP MFE & Libraries: Copilot/LLM & Human Contributor Instructions

> **Purpose:**
> This document provides explicit, actionable rules for Copilot, LLMs, and human contributors working in the Unified WP domain. **Always** use these instructions for code, config, and documentation changes in the targeted apps/libs. If unsure, search the workspace or ask for clarification.

---

## How to Use This File

- **Copilot/LLMs:** Treat every rule as mandatory. Use semantic search and Nx tools before generating or editing code. If unsure, search for examples or ask for clarification.
- **Humans:** Review and follow these rules for all code, config, and documentation changes. Use as a checklist for PRs and reviews.

---

## Quick Reference Checklist

- [ ] Used semantic search before generating new code
- [ ] Used Nx generators for new projects/features
- [ ] Used RxJS and resolvers for data flow
- [ ] Kept code DRY, well-tested, and documented
- [ ] Updated README and followed commit/branch conventions

---

## General Guidelines

- **Copilot/LLM must** follow Nx workspace conventions for project structure, configuration, and code generation.
- **Copilot/LLM must** use semantic search and reuse code from `libs/unified-wp-*` before creating new utilities or features.
- Place tests alongside code using `.spec.ts` suffix; aim for ≥80% coverage.
- Use Angular and Nx best practices for all app and library code.
- Use single quotes, 2-space indentation, and kebab-case for file names.
- Always import types and symbols from the public API barrel (index.ts) of a library (e.g., `@digital-platform/unified-wp-waste-profile/domain`), not from deep internal paths. If a type is not exported from the barrel, update the barrel to export it.
- Document all public APIs and complex logic with JSDoc/TSDoc.
- Never commit secrets or sensitive data; use environment variables for config.
- Use Conventional Commits and branch naming as per monorepo standards.
- Always update or create a `README.md` for new libraries or features.

---

## Nx Usage

- **Copilot/LLM must** use Nx generators for creating new libraries, features, or components.
- Reference `.github/instructions/nx.instructions.md` for Nx-specific flows and automation.
- Use the Nx MCP server and tools for workspace analysis and code generation.

---

## Domain Knowledge

- The Unified WP MFE and related libraries support waste profiling workflows, home page, authorization, disposal facility, and more.
- Each library should encapsulate a clear domain or feature area; avoid cross-library dependencies unless necessary.
- Use feature libraries for UI and business logic, domain libraries for models and types, and data-access libraries for API integration.

---

# Library/Feature-Specific Notes

## unified-wp (App)

- Main Angular MFE for unified waste profiling and related workflows.
- Uses module federation for micro frontend architecture; see and maintain `module-federation.config.js` for shared dependencies.
- Tags: `scope:unified-wp`, `platform:angular`, `owner:Team-Haz-Hippos`.
- All new features must be implemented as libraries under `libs/unified-wp-*` and imported here; avoid placing business logic directly in the app.
- Maintain a clean `src/` structure: keep only bootstrapping, routing, and high-level composition in the app.
- Ensure the app's `README.md` documents entry points, federation config, and integration patterns.

## unified-wp/shell

- Provides the shell and layout for the unified-wp MFE.
- Implements top-level navigation, layout, and global providers.
- Keep shell logic minimal; delegate all feature logic to imported libraries.
- Use Angular best practices for shell composition (e.g., router-outlet, feature modules).
- Document shell responsibilities and extension points in the library's `README.md`.

## unified-wp-common

- Contains shared types, services, UI components, and data-access utilities for unified-wp.
- Subfolders:
  - `api/`: API interfaces and DTOs.
  - `domain/`: Domain models, enums, and business rules.
  - `services/`: Injectable Angular services for cross-cutting concerns.
  - `ui/`: Shared UI components (buttons, cards, etc.).
  - `data-access/`: Data fetching, state management, and API clients.
  - `playground/`: Experimental or demo code (should not be used in production).
- All shared logic and cross-feature utilities should be placed here for reuse.
- Maintain high test coverage and clear documentation for all shared code.

## unified-wp-authorization

- Handles all authorization, authentication, and access control logic for unified-wp.
- Subfolders:
  - `api/`: Auth-related API contracts.
  - `domain/`: Roles, permissions, and auth domain models.
  - `guards/`: Angular route guards for protecting routes and features.
  - `ui/`: Auth-related UI components (login, permission banners, etc.).
- Use guards to enforce access control at the routing level.
- Document all roles, permissions, and guard usage in the library's `README.md`.

## unified-wp-disposal-facility

- Encapsulates all business logic and UI for disposal facility workflows.
- Subfolders:
  - `api/`: Disposal facility API contracts.
  - `domain/`: Facility domain models and rules.
  - `services/`: Facility-specific Angular services.
  - `feature-*`: Feature modules for specific disposal facility flows.
- Place all disposal facility-specific logic here; avoid leaking into other libraries.
- Document endpoints, workflows, and extension points in the library's `README.md`.

## unified-wp-generator

- Contains generator logic, services, and related API integration for unified-wp.
- Subfolders:
  - `api/`: Generator API contracts.
  - `domain/`: Generator domain models.
  - `services/`: Generator-specific Angular services.
  - `data-access/`: API clients and state management for generator features.
- Encapsulate all generator-related logic and keep APIs well-documented.

## unified-wp-home

- Implements the home page and landing features for unified-wp.
- Subfolders:
  - `api/`: Home page API contracts.
  - `domain/`: Home page domain models.
  - `services/`: Home page Angular services.
  - `feature-home-page/`: Feature module for the landing page UI and logic.
- Place all home/landing UI and logic here; keep the app shell clean.
- Document home page features, navigation, and extension points in the library's `README.md`.

## unified-wp-waste-profile

- Implements the waste profile wizard and related domain logic.
- Subfolders:
  - `domain/`: Waste profile domain models and rules.
  - `feature-waste-profile-wizard/`: Feature module for the wizard UI and logic.
  - `services/`: Waste profile Angular services.
- Encapsulate all waste profile-specific flows and UI here.
- Document wizard steps, validation, and integration points in the library's `README.md`.

## unified-wp-waste-profile-cor

- Contains COR-specific waste profile wizard logic and flows.
- Subfolders:
  - `create-waste-profile-wizard-cor/`: COR-specific wizard implementation.
- Use for COR domain-specific flows only; avoid mixing with general waste profile logic.
- Document COR-specific requirements and flows in the library's `README.md`.

## unified-wp-waste-profile-sw

- Contains SW-specific waste profile wizard logic and flows.
- Subfolders:
  - `domain/`: SW-specific domain models.
  - `feature-create-wp/`: SW-specific wizard implementation.
- Use for SW domain-specific flows only; avoid mixing with general waste profile logic.
- Document SW-specific requirements and flows in the library's `README.md`.

## uwp-composition-api (App)

- Serverless API app for composition-related endpoints in the unified-wp domain.
- Use `serverless.yml` and `serverless.config.js` for configuration and deployment.
- Handlers should be thin; delegate business logic to shared libraries in `libs/unified-wp-*`.
- **Authorization:** Use the `user-source-authorization-middleware` (see `libs/unified-wp-common/data-access/src/lib/middleware/user-source-authorization-middleware.ts`) to determine and attach the user's source permission (COR, SW, BOTH, or NONE) based on their permissions. This middleware parses the user's permissions from the Lambda authorizer context and sets the `sourcePermission` property, which downstream handlers can use to enforce access control and business logic. Always configure the middleware with the correct permission keys for your endpoint.
- Document all endpoints, event triggers, and environment variables in the app's `README.md`.
- Ensure all endpoints are covered by unit and integration tests.
- Follow error handling and security best practices; never expose sensitive data.
- Use semantic search to check for existing patterns before adding new endpoints.

## uwp-sw-api (App)

- Serverless API app for SW (Special Waste) domain endpoints.
- Maintain a clear folder structure for handlers, config, and tests.
- Use shared libraries in `libs/unified-wp-waste-profile-sw` and other `unified-wp-*` libs for business logic.
- Document all endpoints, triggers, and environment requirements in the app's `README.md`.
- Ensure all handlers are well-tested and reviewed by a code owner.
- Use environment variables for configuration and secrets.
- Prefer async/await and robust error handling in all handlers.

## uwp-cor-api (App)

- Serverless API app for COR (Customer Owned Resource) domain endpoints.
- Use a consistent structure for handlers, configuration, and tests.
- Delegate business logic to `libs/unified-wp-waste-profile-cor` and other shared libraries.
- Document endpoints, triggers, and environment variables in the app's `README.md`.
- Ensure all endpoints are covered by unit/integration tests and follow monorepo standards.
- Use semantic search to avoid duplicating logic or patterns.
- All code must be reviewed by a code owner before merging.

---

## State Management and UI Principles

- **Copilot/LLM must** prefer using [Elf stores](https://ngneat.github.io/elf/docs/introduction/) for managing all data that needs to be rendered in the UI.
- Store all UI state, API data, and derived data in Elf stores; avoid using component-level state except for local, ephemeral values.
- UI components should be mostly purely declarative: they receive all data via inputs/selectors and emit events for user actions.
- Avoid imperative logic in UI components; use selectors and observables from Elf stores to drive rendering.
- **Use RxJS wherever possible:** Prefer using RxJS streams and operators to manage and transform data, rather than maintaining individual variables or local state. Compose UI using Angular's async pipe and observable patterns for reactivity and maintainability.
- **Where possible, use Angular resolvers to retrieve data before route activation, instead of making network calls directly in components.** This keeps components simple, improves user experience, and centralizes data-fetching logic.
- Compose UI using Angular's async pipe and change detection best practices.
- For more on Elf, see:
  - [Elf Documentation](https://ngneat.github.io/elf/docs/introduction/)
  - [Elf Store Patterns](https://ngneat.github.io/elf/docs/store/)
  - [Elf Query Patterns](https://ngneat.github.io/elf/docs/query/)
- When in doubt, prefer a declarative, observable-driven approach for all UI logic.

---

## Formly for Custom Form Controls

- Use [ngx-formly](https://formly.dev/) for rendering dynamic and custom form controls in the UI.
- Define form schemas and field configurations declaratively using Formly's configuration objects.
- Register all custom form controls as Formly field types and keep them in a dedicated module (e.g., `formly-types.module.ts`).
- Prefer using Formly for complex, dynamic, or reusable forms to maximize maintainability and consistency.
- Keep form logic declarative: validation, visibility, and dynamic behavior should be handled via Formly config, not imperative code.
- **Use Formly wrappers to compose reusable UI patterns around fields (e.g., accordions, cards, panels).**
  - Wrappers allow you to add layout, styling, or behavior to one or more fields without duplicating code.
  - Register wrappers in your Formly module and reference them in your field config using the `wrappers` property.
  - Example usage:
    ```ts
    // In your Formly field config
    {
      key: 'section1',
      type: 'input',
      wrappers: ['accordion'], // applies the accordion-wrapper
      templateOptions: {
        label: 'Section 1',
      },
    }
    ```
  - See `accordion-wrapper` for a real-world example of a custom Formly wrapper in this workspace.
- Document all custom field types, wrappers, and usage patterns in the relevant library's `README.md`.
- For more on Formly, see:
  - [Formly Documentation](https://formly.dev/)
  - [Custom Field Types](https://formly.dev/guide/custom-formly-field)
  - [Formly Wrappers](https://formly.dev/guide/wrappers)
  - [Formly Examples](https://formly.dev/examples/)

## Formly Async Validator Usage (Error Prevention)

When using async validators with Formly field configs:

- **Per-field async validators:** Always provide a direct function reference in the `asyncValidators` array for the field. Do not use a named validator object unless it is registered globally.
  - **Return values:** In this workspace, Formly async validators must always return `true` (valid) or `false` (invalid), never `null` or an error object.
    - Example (required):
      ```ts
      asyncValidators: [
        (control: AbstractControl) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (control.value === 'fail') {
                resolve(false); // invalid
              } else {
                resolve(true); // valid
              }
            }, 500);
          });
        },
      ];
      ```
    - **Incorrect:**
      ```ts
      // Do NOT do this:
      asyncValidators: [
        (control: AbstractControl) => Promise.resolve(null), // ❌
      ];
      ```
    - Always use `true` for valid and `false` for invalid.
- **Global async validators:** If you want to use a named validator (e.g., `{ name: 'myAsync', validation: ... }`), you must register it globally via `FormlyModule.forRoot({ validators: [...] })` in your app or shared Formly module. See the [Formly async validation docs](https://formly.dev/guide/validation#async-validation) for details.
- If you see the error `[Formly Error] The validator "<name>" could not be found. Please make sure that is registered through the FormlyModule declaration.`, it means you are referencing a named validator that is not globally registered.

**Summary:** For this workspace, use a direct function reference for async validators in field configs, and always return `true` (valid) or `false` (invalid). Only use named/global validators if you have a cross-form need and have registered them in your Formly module.

---

## Common Pitfalls & Anti-Patterns

- **Never** duplicate logic; always check for reusable code in `libs/`.
- **Never** use `any` in TypeScript unless absolutely necessary.
- **Never** make network calls directly in components; use resolvers or services.
- **Never** manipulate the DOM directly; use Angular abstractions.
- **Never** commit secrets or sensitive data.

---

## Copilot/LLM Usage

- Use these instructions as the primary source of truth for code generation.
- When external documentation links are provided, use them for context, but do not fetch them automatically unless explicitly requested.
- If unsure about a pattern or convention, use semantic search to find examples in the codebase.
- Always review generated code for correctness, security, and style before committing.

---

## Copilot/LLM Live Compilation & Error Fixing Workflow (Agent Mode)

After any logical set of changes (such as a completed feature, refactor, or batch of edits) made to `apps/uwp*`, `libs/unified-wp*`, or `apps/unified-wp*` by Copilot/LLM agent mode, you **must** run `npx nx run unified-wp:build`.

"Any change" refers to a coherent unit of work or natural break point in the agent's workflow—not every single character or line change. The build/test feedback loop should be triggered after the agent completes a meaningful set of edits, before considering the task or step complete.

If the build fails with any compilation errors, agent mode is required to fix all errors and rerun the build.

This feedback loop (edit → build → fix errors → repeat) is **mandatory**: agent mode must continue this process until the build completes with zero compilation errors.

Only consider the change successful and complete when the build passes without errors.

---

## Example Patterns

### Angular Functional Resolver Example

```ts
// Functional resolver pattern (recommended)
export const WasteProfileResolver: ResolveFn<void> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot
): Observable<void> => {
  // ...implementation as in waste-profile.resolver.ts
};
```

### Angular Resolver Example

```ts
@Injectable({ providedIn: 'root' })
export class ExampleResolver implements Resolve<DataType> {
  constructor(private service: DataService) {}
  resolve(route: ActivatedRouteSnapshot): Observable<DataType> {
    return this.service.getData();
  }
}
```

### Elf Store Example

```ts
export interface ExampleState {
  items: Item[];
}
const exampleStore = createStore(
  { name: 'example' },
  withProps<ExampleState>({ items: [] })
);
@Injectable({ providedIn: 'root' })
export class ExampleStore {
  public items$ = exampleStore.pipe(select((state) => state.items));
  setItems(items: Item[]) {
    exampleStore.update((state) => ({ ...state, items }));
  }
}
```

### Formly Wrapper Registration Example

```ts
// In your Formly module
FormlyModule.forRoot({
  wrappers: [{ name: 'accordion', component: AccordionWrapperComponent }],
});
```

---

## Summary Checklist

- [ ] Used semantic search before generating new code
- [ ] Used Nx generators for new projects/features
- [ ] Used RxJS and resolvers for data flow
- [ ] Kept code DRY, well-tested, and documented
- [ ] Updated README and followed commit/branch conventions
