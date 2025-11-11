---
mode: agent
---

# Generate Formly Fields JSON Configuration

## Task Description

Analyze the provided wireframe/image of a form and generate a complete Formly fields JSON configuration for an existing subsection component. The configuration should follow the structure and patterns used in the Unified WP application, using appropriate Formly field types from the project's library.

## Inputs

- **subsection-id**: The ID of an existing subsection component where the fields configuration will be added/updated
- **wireframe-file**: Path to a wireframe specification file (optional, if wireframe analysis is needed)
- **image**: An image of the form UI to be analyzed and converted to Formly fields configuration (should be attached to the conversation context)
- **special-requirements**: Any additional requirements or constraints for the fields (optional)

> **Note**: Either an image or wireframe file should be provided for analysis. The agent will generate the appropriate Formly configuration based on the visual specification.

## Process Overview

1. The agent will locate the subsection component by searching for the provided subsection-id:

   - Find the component file that contains the matching ID
   - Extract existing component information (class name, properties, current fields)
   - Analyze any existing imports and dependencies
   - **CRITICAL**: Identify the SubSection's type T from `BaseSubSection<T>` to understand the data model structure

2. The agent will analyze the provided wireframe file or image to identify form elements and layout structure.

3. The agent will generate a complete Formly fields configuration following the project's formly component patterns (see `.github/instructions/formly.components.instructions.md`).

4. The agent will integrate the configuration into the existing subsection component.

5. The agent will update the data model/schema to align with the implemented Formly configuration:
   - Analyze the Formly fields for conditional logic, validation rules, and field requirements
   - Update the corresponding Zod schema to match the UI validation patterns
   - Ensure schema conditional logic aligns with Formly expressions (hide/show, required/optional)
   - Add appropriate validation constraints (min/max, length, format, etc.)
   - Handle union schemas for conditional field requirements
   - Update related types and interfaces as needed
   - Verify type alignment and ensure TypeScript compilation passes

## Available Resources

For detailed information about Formly components, field types, layout patterns, validation, and best practices, refer to:

- `.github/instructions/formly.components.instructions.md` - Comprehensive guide to all available Formly field types, layouts, and patterns
- Project's existing formly-elements components in the codebase
- BaseSubsection architecture and FormDataStore integration patterns

## Image/Wireframe Analysis Guidelines

When analyzing the provided image or wireframe file:

1. **Identify Form Elements**: Map each UI element to appropriate Formly field types
2. **Determine Field Requirements**: Identify required vs. optional fields, validation rules
3. **Layout Structure**: Analyze grid layout, column arrangements, responsive behavior
4. **Interactive Logic**: Note conditional visibility, dynamic behavior, field relationships
5. **Data Binding**: Understand expected data models and binding patterns
6. **Character Limits**: Apply COR2 alignment for text field limitations
7. **Accessibility**: Ensure proper labeling, validation messages, and interaction patterns
8. **Type Safety**: **CRITICAL** - Ensure all Formly field `key` properties exactly match the properties defined in the SubSection's type T. This ensures type safety and proper data binding.
9. **Actionable Links**: Identify clickable links in the UI (e.g., "+ Add Address Line 2", "Change", "Edit") and implement using `custom-link` as either a field type or wrapper as appropriate

### Type Safety Requirements

For example, if a component extends `BaseSubSection<SWGeneratorCompany>`, the SWGeneratorCompany type defines:

```typescript
export const SWGeneratorCompanySchema = z.object({
  generatorCompanyName: z.string(),
  generatorSource: SWGeneratorSourceSchema,
  selectedGenerator: z.lazy(() => SWGeneratorSchema).optional(),
});
```

Then the Formly field keys MUST match exactly:

- `generatorCompanyName` (not `companyName` or `generator_company_name`)
- `generatorSource` (not `source` or `generator_source`)
- `selectedGenerator` (not `selected_generator` or `generator`)

### Custom Link Usage Guidelines

When you identify clickable action links in the wireframe/image (e.g., "+ Add Address Line 2", "Change", "Edit", "Show Advanced Options"):

**Use as Field Type (`type: 'custom-link'`)** when:

- The link adds optional fields or triggers standalone actions
- Common patterns: "+ Add Another", "+ Show Advanced Options", "- Hide Section"
- The link is not directly associated with wrapping a specific field

```typescript
{
  key: 'addAddressLine2',
  type: 'custom-link',
  props: {
    label: '+ Add Address Line 2',
    onChangeValue: () => this.addAddressLine2()
  },
  className: 'ms-4 small',
  expressions: {
    hide: () => this.isAddressLine2Visible
  }
}
```

**Use as Wrapper (`wrappers: ['custom-link']`)** when:

- The link is directly associated with editing or changing existing field(s)
- Common patterns: "Change" or "Edit" links next to field values
- The link wraps around one or more related fields

```typescript
{
  wrappers: ['custom-link'],
  props: {
    label: 'Change',
    onChangeValue: () => this.enableEditMode()
  },
  fieldGroup: [
    {
      key: 'facilityName',
      type: 'text-input',
      props: { label: 'Facility Name' }
    }
  ]
}
```

## Output Format

Generate a complete Formly fields configuration object following this structure:

```typescript
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
      // Individual form fields based on wireframe/image analysis
      // **CRITICAL**: Use field keys that exactly match the SubSection's type T properties
      // Use appropriate field types, layouts, and validation
    ],
  },
];
```

### Field Key Requirements

**CRITICAL**: All `key` properties in the fieldGroup must exactly match the property names defined in the SubSection's type T. For example:

- If the type has `generatorCompanyName: z.string()`, use `key: 'generatorCompanyName'`
- If the type has `siteAddress: AddressSchema`, use `key: 'siteAddress'`
- If the type has nested objects like `contact: { firstName: z.string(), lastName: z.string() }`, use nested field groups with matching keys

### Schema-Formly Alignment Requirements

After generating the Formly configuration, the agent must update the corresponding Zod schema to ensure validation logic alignment:

#### Conditional Field Patterns

```typescript
// If Formly has conditional required logic:
expressions: {
  'props.required': 'model.wasteType === "hazardous"',
  hide: 'model.wasteType !== "hazardous"'
}

// Schema must use union pattern:
const HazardousSchema = z.object({
  wasteType: z.literal('hazardous'),
  epaCode: z.string().min(1), // Required when hazardous
});

const NonHazardousSchema = z.object({
  wasteType: z.literal('non-hazardous'),
  epaCode: z.string().optional(), // Optional when non-hazardous
});

const WasteSchema = z.union([HazardousSchema, NonHazardousSchema]);
```

#### Multi-Checkbox Alignment

```typescript
// Formly multi-checkbox structure
{
  key: 'components',
  type: 'multi-checkbox',
  // ...
}

// Schema must match nested structure
const Schema = z.object({
  components: z.object({
    selectedItems: z.array(z.enum(['option1', 'option2'])).optional()
  })
});
```

#### Validation Constraints

```typescript
// Formly field properties
props: {
  type: 'number',
  min: 0,
  max: 100,
  maxLength: 50
}

// Schema must match constraints
z.number().min(0).max(100)
z.string().max(50)
```

## Success Criteria

- The generated fields configuration accurately represents all UI elements in the wireframe/image
- **CRITICAL**: All Formly field `key` properties exactly match the properties defined in the SubSection's type T for perfect type safety and data binding
- Correct Formly field types and appropriate properties are used for each form element
- Actionable links ("+Add", "Change", "Edit") are implemented using `custom-link` as field type or wrapper as appropriate
- Required/optional states and validation rules are properly specified based on the type definition
- Conditional visibility and interactive logic is correctly implemented
- **SCHEMA ALIGNMENT**: The Zod schema is updated to match the Formly configuration:
  - Conditional field requirements align with Formly `expressions['props.required']` logic
  - Schema validation constraints match Formly field properties (min/max, length, format)
  - Union schemas properly handle conditional field visibility (hide/show expressions)
  - Multi-checkbox fields use correct `{ selectedItems: [...] }` structure
  - Nested object structures match fieldGroup hierarchies
- Layout structure matches the design exactly with proper responsive behavior
- Character limits and COR2 alignment requirements are applied where specified
- The configuration integrates seamlessly into the existing subsection component
- All project conventions and patterns are followed
- TypeScript compilation passes without type errors due to proper field key and schema alignment
- Form validation behavior matches business requirements in both UI and schema layers

## Example Usage

```
Follow instructions in generate.formly.fields.prompt.md.
- **subsection-id**: generator-contact-info
- **wireframe-file**: plan/contact-form-wireframe.md
- **special-requirements**: Include phone number formatting, make email field required, use two-column responsive layout

> **Note**: The agent will first identify that the component extends `BaseSubSection<ContactInfo>` and examine the ContactInfo type definition to ensure all Formly field keys match exactly (e.g., `firstName`, `lastName`, `emailAddress`, `phoneNumber`, etc.).
```

```
Follow instructions in generate.formly.fields.prompt.md.
- **subsection-id**: facility-selection
- **special-requirements**:
  - Include type-ahead for facility search
  - Add conditional fields based on facility type
  - Apply COR2 character limits to text areas
  - Use accordion wrapper with proper status observables

> **Note**: The agent will locate the facility-selection component, examine its `BaseSubSection<FacilitySelectionType>` declaration, analyze the FacilitySelectionType schema to understand required field keys like `facilityType`, `selectedFacility`, `searchQuery`, etc., and ensure perfect alignment.
```

The agent will locate the subsection component by ID, analyze the provided wireframe/image, and generate a comprehensive Formly fields configuration following all project patterns and requirements.

## Common Type Patterns in the Codebase

When examining SubSection types, you'll commonly find these patterns:

### Generator Company Types

- `generatorCompanyName: z.string()`
- `generatorSource: z.enum(['addNew', 'selectSaved', 'noSelect'])`
- `selectedGenerator: z.lazy(() => GeneratorSchema).optional()`

### Address Types

- `siteAddress: AddressSchema`
- `mailingAddress: AddressSchema`
- `isSameAsSiteAddress: z.boolean()`

### Contact Types

- `firstName: z.string()`
- `lastName: z.string()`
- `email: z.string()`
- `phone: z.string()`
- `contactType: z.enum(['addNew', 'selectSavedContact'])`

### Details Types

- `epaId: z.string()`
- `regulatoryIdNumber: z.string().optional()`
- `naicsNumber: z.string().optional()`
- `regulatoryIdNumberNotApplicable: z.boolean().optional()`

Always examine the actual type definition rather than assuming field names, as variations exist across different sections and systems (SW vs COR).
