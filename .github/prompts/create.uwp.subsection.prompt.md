---
mode: agent
---

# Create Unified WP Subsection

## Task Description

Create a complete subsection for the Unified Waste Profile application based on the provided subsection name and application type (SW or COR). This includes generating all necessary files, implementing proper component structure, and ensuring integration with the BaseSubSection class.

## Inputs

- **subsection-name**: A snakecase name for the subsection (e.g., "generatorAddress")
- **application-type**: Either "SW" (Special Waste) or "COR" (Customer Owned Resource)
- **section-id**: The parent section ID (e.g., "generator-information")
- **display-title**: Human-readable title for the subsection (e.g., "Generator Address")
- **model-properties**: List of properties for the model interface (optional)

## Output Files

The agent will create the following files in the appropriate location:

```
libs/unified-wp-waste-profile/feature-waste-profile-wizard/src/lib/[application-type]/subsections/[subsection-name]/
  - [subsection-name].component.ts
  - [subsection-name].component.html
  - [subsection-name].component.scss
  - [subsection-name].component.spec.ts
```

**Note:** Model interfaces should be defined in existing domain libraries (e.g., `@digital-platform/unified-wp-common-domain`) rather than creating separate `.model.ts` files in each subsection. Import existing model interfaces from the appropriate domain libraries.

## File Content Requirements

### Model Interface

- Use existing model interfaces from domain libraries (e.g., `@digital-platform/unified-wp-common-domain`)
- Import the appropriate model type for the subsection's generic parameter
- For barebones subsections, use a simple interface with optional string properties
- Example import:
  ```typescript
  import { CORGeneratorCompany } from '@digital-platform/unified-wp-common-domain';
  ```

### Component Class (.component.ts)

- Extend `BaseSubSection<T>` with proper model interface
- Implement `OnInit` lifecycle hook
- Use standalone component architecture
- Include proper imports (CommonModule, ReactiveFormsModule, FormlyModule, FormlyBootstrapModule)
- Override required base properties: `id`, `sectionId`, `title`
- Implement Formly fields configuration with accordion wrapper
- Use proper selectors and naming conventions based on application type
- Import necessary domain types from `@digital-platform/unified-wp-common-domain`
- For testing, ensure SharedComponentsModule is available for FormlyAccordionWrapperComponent
- Example structure:

  ```typescript
  @Component({
    selector: 'digital-platform-sw-customer-info',
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      FormlyModule,
      FormlyBootstrapModule,
    ],
    templateUrl: './customer-info.component.html',
    styleUrls: ['./customer-info.component.scss'],
  })
  export class SWCustomerInfoComponent
    extends BaseSubSection<CustomerInfo>
    implements OnInit
  {
    override id = 'customerInfo' as SWSubSectionId;
    override sectionId = 'customer-information' as SectionId;
    override title = 'Customer Information';

    fields: FormlyFieldConfig[] = [
      {
        fieldGroupClassName: 'd-flex flex-column gap-6',
        wrappers: ['accordion'],
        props: {
          title: this.title,
          id: this.id,
          status$: this.accordionStatus$,
          collapse$: this.shouldCollapse$,
          subSectionValid$: this.subSectionValid$,
          hideButtons$: this.hideButtons$,
          onToggle: this.onToggleAccordionState.bind(this),
        },
        fieldGroup: [
          // For barebones subsection, leave empty or add placeholder comment
          // Individual form fields will be added later during implementation
        ],
      },
    ];

    override ngOnInit(): void {
      super.ngOnInit();
      // Additional initialization
    }
  }
  ```

### HTML Template (.component.html)

- Include both read-only and edit mode templates with conditional rendering
- Read-only mode shows simple data display
- Edit mode uses formly-form for form rendering
- Use \*ngIf with displayMode property from BaseSubSection
- Example:
  ```html
  <div>
    <div *ngIf="displayMode === 'read-only'; else editMode">
      <!-- Read-only display - for barebones subsection, show placeholder text -->
      No data to display yet.
      <!-- Add specific field displays when model properties are defined -->
    </div>
    <ng-template #editMode>
      <form [formGroup]="form">
        <formly-form
          [form]="form"
          [fields]="fields"
          [model]="data"
          (modelChange)="modelChange($event)"
        ></formly-form>
      </form>
    </ng-template>
  </div>
  ```

### Component Styles (.component.scss)

- Create an empty SCSS file for component-specific styles
- Styles can be added later as needed for specific form fields or layout requirements
- Example:
  ```scss
  // Component-specific styles will be added here as needed
  ```

### Component Tests (.component.spec.ts)

- Use @ngneat/spectator/jest for testing
- Mock NavBarService and FormDataStore dependencies with proper observables and methods
- Include FormlyModule configuration with necessary form types and wrappers
- Include basic component creation test
- Test component properties (id, sectionId, title)
- Test BaseSubSection inheritance
- Follow established testing patterns from existing components
- Use BehaviorSubject for mock observables
- Include proper imports for SharedComponentsModule

**Basic test structure:**

```typescript
describe('[ComponentName]Component', () => {
  let spectator: Spectator<[ComponentName]Component>;
  let component: [ComponentName]Component;

  const mockActiveSubSection$ = new BehaviorSubject<string>('subsectionId');
  const mockActiveSectionState$ = new BehaviorSubject<Record<string, any>>({});
  const mockState$ = new BehaviorSubject<any>({});
  const mockActiveSection$ = new BehaviorSubject<any>({
    id: 'section-id',
    children: [{ id: 'subsectionId', isActive: true }],
  });

  const navBarServiceMock = {
    navBarClickEvents: jest.fn(),
    activeSubSection$: mockActiveSubSection$,
    activeSectionState$: mockActiveSectionState$,
    activeSection$: mockActiveSection$,
    goNext: jest.fn(),
  };

  const formDataStoreMock = {
    updateSubSectionData: jest.fn().mockReturnValue(of({})),
    handleAccordionClick: jest.fn(),
    state$: mockState$,
  };

  const createComponent = createComponentFactory({
    component: [ComponentName]Component,
    imports: [
      FormlyModule.forRoot({
        types: [
          // Add required form types
        ],
        wrappers: [
          { name: 'accordion', component: FormlyAccordionWrapperComponent },
        ],
      }),
      FormlyBootstrapModule,
      SharedComponentsModule,
    ],
    providers: [
      mockProvider(NavBarService, navBarServiceMock),
      mockProvider(FormDataStore, formDataStoreMock),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
    component = spectator.component;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Application-Specific Differences

- **SW Application**:

  - Use `SWSubSectionId` type for the id
  - Use `digital-platform-sw-[subsection-name]` as the component selector
  - Class name should be `SW[PascalCaseSubsectionName]Component`
  - Import `SWSubSectionId` from `@digital-platform/unified-wp-common-domain`

- **COR Application**:
  - Use `CORSubSectionId` type for the id
  - Use `digital-platform-cor-[subsection-name]` as the component selector
  - Class name should be `COR[PascalCaseSubsectionName]Component`
  - Import `CORSubSectionId` from `@digital-platform/unified-wp-common-domain`

### Key Patterns to Follow

1. **Accordion Structure**: All subsections use accordion wrapper with consistent props
2. **Display Modes**: HTML template must handle both read-only and edit modes using displayMode property
3. **Standalone Components**: All new components should be standalone
4. **Proper Imports**: Include only necessary imports (CommonModule, ReactiveFormsModule, FormlyModule, FormlyBootstrapModule)
5. **Testing Structure**: Use spectator with proper mocks for NavBarService and FormDataStore, include SharedComponentsModule
6. **Field Configuration**: Use Formly field configuration with proper types and validations
7. **BaseSubSection Integration**: Extend BaseSubSection<T> and properly implement required abstract properties

## Success Criteria

- All files are created in the correct location following the established folder structure
- Component extends BaseSubSection and implements required properties correctly
- Component uses standalone architecture with proper imports
- Model interface correctly defines the data structure with optional properties
- HTML template uses simple formly-form structure (no read-only/edit mode handling)
- Fields configuration uses accordion wrapper with consistent structure
- Test file includes spectator setup with proper mocks and basic functionality tests
- Files follow naming conventions and code style of the existing generator-company-name pattern
- Component properly integrates with BaseSubSection lifecycle and accordion behavior
- All TypeScript types are correctly imported and used
- HTML template correctly implements displayMode conditional rendering for read-only and edit modes
- Test file includes SharedComponentsModule import and proper mock structure with BehaviorSubjects

## Embedding Subsection in Section

After creating the subsection component, it must be properly embedded in the parent section component:

### Section Component Updates Required

1. **Import the New Subsection Component**:

   ```typescript
   import { [ComponentName]Component } from '../../subsections/[subsection-name]/[subsection-name].component';
   ```

2. **Add to Component Imports Array**:

   ```typescript
   @Component({
     // ... other properties
     imports: [
       CommonModule,
       // ... other imports
       [ComponentName]Component, // Add the new subsection component
     ],
     // ...
   })
   ```

3. **Add Component Tag to Section Template**:
   ```html
   <div class="form-content py-8 d-flex flex-column gap-8">
     <!-- Other subsection components -->
     <digital-platform-[application-type]-[subsection-name]></digital-platform-[application-type]-[subsection-name]>
     <!-- More subsection components -->
   </div>
   ```

### Example Integration

For a "customer-info" subsection in the SW application within the "customer-information" section:

**Section Component TypeScript**:

```typescript
import { SWCustomerInfoComponent } from '../../subsections/customer-info/customer-info.component';

@Component({
  imports: [
    CommonModule,
    // ... other imports
    SWCustomerInfoComponent,
  ],
})
```

**Section Component Template**:

```html
<div class="form-content py-8 d-flex flex-column gap-8">
  <digital-platform-sw-customer-info></digital-platform-sw-customer-info>
</div>
```

**Note**: The subsection will be automatically integrated into the form navigation and state management through the BaseSubSection class. No additional wiring is required for form data handling or navigation.

## Build Verification

After creating subsection files and integration changes, run:

```bash
npx nx run unified-wp:build
```

**The build must pass with zero errors.** Common fixes:

- Add missing component imports to section files
- Fix TypeScript type imports from `@digital-platform/unified-wp-common-domain`
- Add new components to section's imports array
- Resolve circular dependencies

**The subsection creation is only complete when the unified-wp build passes successfully.**

## Example Usage

To create a "customer-info" subsection for the SW application:

- **subsection-name**: customer-info
- **application-type**: SW
- **section-id**: customer-information
- **display-title**: Customer Information
- **model-properties**: customerName, customerNumber, customerType
