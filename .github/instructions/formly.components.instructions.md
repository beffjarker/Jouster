---
applyTo: 'libs/unified-wp-waste-profile/feature-waste-profile-wizard/**'
---

# Formly Components Guide for Waste Profile Wizard

## Component Architecture

- **Sections**: High-level groupings extending `BaseSection`
- **Subsections**: Form components extending `BaseSubsection` with accordion wrappers
- **Fields**: Individual form controls using standardized Formly types

## Core Formly Components

### Text Input

```typescript
{
  key: 'fieldName',
  type: 'text-input',
  className: 'col-12 col-md-6', // responsive columns
  props: {
    label: 'Field Label', // Text displayed above/beside the input field
    placeholder: 'Enter text here...', // Hint text shown inside the input field
    required: true,
    type: 'text', // 'email', 'tel', 'password', 'number'
    maxLength: 100,
    minLength: 2,
    attributes: {
      'data-automation-id': 'field-name',
      'digitalPlatformPhoneFormat': 'true' // for phone formatting
    }
  },
  validation: {
    messages: {
      required: 'This field is required',
      email: 'Enter a valid email address',
      minlength: (error, field) => `Minimum ${field.props?.minLength} characters`
    }
  }
}
```

**Key Properties:**

- `label`: The field label displayed above or beside the input (e.g., "Company Name")
- `placeholder`: Hint text shown inside the empty input field (e.g., "Enter your company name")

````

### Radio Buttons (Standard)

```typescript
{
  key: 'selection',
  type: 'radio-buttons',
  props: {
    label: 'Select Option',
    options: [{ label: 'Option 1', value: 'option1' }],
    required: true,
    align: 'vertical' // 'horizontal' | 'vertical'
  }
}

// For partial text formatting, use HTML markup in the label
{
  key: 'debrisQuestion',
  type: 'radio-buttons',
  props: {
    label: 'Contains <strong>Non-Friable Debris Material</strong> > 2-inch size?',
    align: 'horizontal',
    options: [
      { label: 'Yes', value: 'T' },
      { label: 'No', value: 'F' }
    ]
  }
}
````

### Radio CTA Buttons (Call-to-Action Style)

```typescript
{
  key: 'ctaSelection',
  type: 'radio-cta-button',
  props: {
    label: 'Choose Option',
    options: [{ label: 'Primary', value: 'primary' }],
    size: 'large', // 'large' | 'small'
    required: true
  }
}
```

### Toggle Switch

```typescript
{
  key: 'toggle',
  type: 'toggle-switch',
  props: {
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' }
    ]
  }
}
```

### Multi-Checkbox (Two Variants)

```typescript
// Standard layout with columns
{
  key: 'standardMulti',
  type: 'multi-checkbox',
  props: {
    label: 'Select Options',
    styleVariant: 'standard',
    columns: 2, // grid layout
    options: [
      { key: 'opt1', label: 'Option 1' },
      { key: 'opt2', label: 'Option 2', description: 'Extra info' }
    ]
  }
}

// Chip layout with selection limit
{
  key: 'chipMulti',
  type: 'multi-checkbox',
  props: {
    styleVariant: 'chip',
    maxSelections: 3,
    options: [{ key: 'bulk', label: 'Bulk' }]
  }
}
```

### Table Checkbox (Tabular Selection)

```typescript
{
  key: 'tableSelections',
  type: 'table-checkbox',
  props: {
    label: 'Select Items',
    required: true,
    tableColumns: [
      { key: 'description', label: 'Description', width: '70%' },
      { key: 'category', label: 'Category', width: '30%' }
    ],
    options: [
      { key: 'item1', description: 'Item 1', category: 'Category A' }
    ],
    maxItems: 5 // items per column before wrapping
  }
}
```

### Dropdown Checkbox (Multi-Select Dropdown)

```typescript
{
  key: 'hazardousComponents',
  type: 'dropdown-checkbox',
  props: {
    label: 'Hazardous Components',
    placeholder: 'Select hazardous components…',
    required: true,
    searchable: true, // enables search filter
    showSelectedCount: true, // shows "Three selected" in trigger
    maxSelections: 5, // limit selections (optional)
    options: [
      { key: 'lead', label: 'Lead' },
      { key: 'mercury', label: 'Mercury' },
      { key: 'cadmium', label: 'Cadmium', description: 'Heavy metal' },
      { key: 'arsenic', label: 'Arsenic', disabled: true }
    ]
  },
  validation: {
    messages: { required: 'At least one option must be selected' }
  }
}
```

### Type-Ahead (Searchable Dropdown)

```typescript
{
  key: 'searchField',
  type: 'type-ahead',
  props: {
    placeholder: 'Search and select',
    required: true,
    items: contactsArray, // searchable data
    columns: [
      { key: 'name', header: 'Name', searchable: true },
      { key: 'code', header: 'Code', searchable: false }
    ],
    displayFn: (item) => `${item.name} (${item.code})`,
    maxItems: 50, // limit dropdown results
    errorMessage: 'Please select an item'
  }
}
```

### Date Picker

```typescript
{
  key: 'dateField',
  type: 'date-picker',
  props: {
    placeholder: 'Select date',
    required: true
  }
}
```

### Repeat Type (Dynamic Arrays)

```typescript
{
  key: 'repeatData',
  type: 'repeat-type',
  props: {
    addMoreText: 'Add Another', // Note: Do not include '+' sign, it's added by the UI component
    maxLimit: 5,
    required: true
  },
  fieldArray: {
    fieldGroup: [
      {
        key: 'itemName',
        type: 'text-input',
        props: { placeholder: 'Enter name', required: true }
      }
    ]
  }
}
```

**Important Note:** The `addMoreText` property should **not** include the '+' prefix as it is automatically added by the repeat-type component UI. Simply provide the text label (e.g., 'Add Another Row', 'Add Contact', etc.).

### Section Labels with Tooltips

```typescript
{
  key: 'helpLabel',
  type: 'section-label-with-tooltip',
  props: {
    label: 'Section Title',
    tooltipContent: 'Helpful explanation text',
    tooltipTrigger: 'hover', // 'hover' | 'click'
    tooltipWidth: '300'
  }
}
```

### Checkbox (Single)

```typescript
{
  key: 'agreement',
  type: 'checkbox',
  props: {
    label: 'I agree to terms',
    required: true
  }
}
```

## Layout Patterns

### Accordion Wrapper (Required for Subsections)

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
      onContinue: this.onContinue.bind(this)
    },
    fieldGroup: [/* form fields */]
  }
];
```

### Custom Link

The `custom-link` can be used both as a **Formly field type** (standalone component) and as a **wrapper** around other fields. It provides a clickable text link that can trigger custom actions.

#### Usage as a Standalone Field Type

Use `type: 'custom-link'` when you need an actionable link in the form, such as "+ Add Address Line 2" or "Change selection".

```typescript
// Basic standalone usage
{
  key: 'addSiteLine2',
  type: 'custom-link',
  props: {
    label: '+ Add Address Line 2',
    onChangeValue: () => {
      this.addAddressLine2('site');
    },
    disabled: false // Optional: disable the link
  },
  className: 'ms-4 small', // Optional: add spacing/styling
  expressions: {
    hide: () => this.isAddressLine2Visible // Conditionally show/hide
  }
}

// Example: Conditional "Add" link
{
  key: 'addAnotherContact',
  type: 'custom-link',
  props: {
    label: '+ Add Another Contact',
    onChangeValue: () => {
      this.addContact();
    }
  },
  expressions: {
    hide: (field) => field.model?.contacts?.length >= 5, // Hide when max reached
    'props.disabled': (field) => field.model?.isSubmitting
  }
}

// Example: Dynamic label based on state
{
  key: 'toggleAdvanced',
  type: 'custom-link',
  props: {
    onChangeValue: () => {
      this.toggleAdvancedOptions();
    }
  },
  expressions: {
    'props.label': (field) => {
      return field.model?.showAdvanced ? '- Hide Advanced Options' : '+ Show Advanced Options';
    }
  }
}
```

#### Usage as a Wrapper

Use `wrappers: ['custom-link']` when you want to wrap a link around existing field(s), useful for "Change" or "Edit" links next to field values.

```typescript
// Basic wrapper usage
{
  wrappers: ['custom-link'],
  props: {
    label: 'Change', // Text displayed as the link
    onChangeValue: () => {
      this.enableEditMode();
    },
    disabled: false
  },
  fieldGroup: [
    // Field(s) that this link is associated with
    {
      key: 'displayValue',
      type: 'text-input',
      props: { label: 'Value' }
    }
  ]
}

// Example: Editable field with "Change" link
{
  fieldGroupClassName: 'd-flex align-items-center gap-2',
  wrappers: ['custom-link'],
  props: {
    label: 'Change',
    onChangeValue: () => {
      this.enableEditMode();
    },
    disabled: this.isEditMode // Disable link when already editing
  },
  fieldGroup: [
    {
      key: 'facilityName',
      type: 'text-input',
      props: {
        label: 'Facility Name',
        disabled: !this.isEditMode
      }
    }
  ]
}

// Example: Conditional link based on form state
{
  wrappers: ['custom-link'],
  props: {
    label: 'Edit Address',
    onChangeValue: () => {
      this.openAddressModal();
    }
  },
  expressions: {
    'props.disabled': 'model.displayMode === "review"', // Disable in review mode
    'props.label': (field) => {
      return field.model?.hasAddress ? 'Change Address' : 'Add Address';
    }
  },
  fieldGroup: [
    {
      key: 'addressDisplay',
      template: '<div>{{ model.formattedAddress }}</div>'
    }
  ]
}
```

**Key Properties:**

- `label`: The text displayed as the clickable link (e.g., "+ Add Address Line 2", "Change", "Edit")
- `onChangeValue`: Callback function executed when the link is clicked
- `disabled`: Boolean to enable/disable the link (disabled links appear grayed out with `cursor: not-allowed`)

**Styling:**

- Default color: `#0472a2` (RSI blue)
- Hover state: Cursor changes to pointer
- Disabled state: Gray color (`#ccc`) with no-drop cursor
- Width: `fit-content` (wraps to text size)
- Can be styled with `className` for spacing (e.g., `ms-4 small` for margin and smaller font)

**Common Use Cases:**

- **Standalone**: Adding optional fields (e.g., "+ Add Address Line 2", "+ Add Another Contact")
- **Standalone**: Toggle actions (e.g., "Show Advanced Options")
- **Wrapper**: "Change" or "Edit" links next to read-only field displays
- **Wrapper**: Triggering modal dialogs or edit modes for existing fields
- **Both**: Providing contextual actions that modify form state or visibility

### Section Divider

```typescript
{
  template: `<div class="section-divider"></div>`,
  expressions: {
    hide: (_: FormlyFieldConfig): boolean => this.editMode$.value,
  },
}
```

### Responsive Grid Layouts

```typescript
// Two-column responsive layout
{
  fieldGroupClassName: 'row g-3',
  fieldGroup: [
    {
      key: 'field1',
      type: 'text-input',
      className: 'col-12 col-md-6', // full width mobile, half on desktop
      props: { label: 'Field 1' }
    },
    {
      key: 'field2',
      type: 'text-input',
      className: 'col-12 col-md-6',
      props: { label: 'Field 2' }
    }
  ]
}

// Address fields (3-column)
{
  fieldGroupClassName: 'row g-3',
  fieldGroup: [
    { key: 'city', className: 'col-12 col-md-4' },
    { key: 'state', className: 'col-12 col-md-4' },
    { key: 'zip', className: 'col-12 col-md-4' }
  ]
}
```

## Dynamic Behavior with Expressions

### Conditional Logic

```typescript
expressions: {
  hide: '!model.showAdvanced', // conditional visibility
  'props.required': 'model.makeRequired', // dynamic required state
  'props.disabled': 'model.isReadOnly || model.displayMode === "review"'
}
```

### Using BaseSubsection Data Property

```typescript
// Access form data from BaseSubsection's this.data property
// this.data is of type T (the generic parameter of BaseSubsection<T>)
expressions: {
  'props.options': () => this.data?.availableOptions,
  'props.maxLength': () => this.data?.maxCharacterLimit || 100,
  'props.placeholder': () => this.data?.dynamicPlaceholder,
  'model.calculatedField': () => this.data?.sourceValue * 2,
  hide: () => !this.data?.shouldShowField
}
```

### Waste Profile Specific Patterns

```typescript
// Show based on generator type
expressions: {
  hide: 'model.generatorType !== "large-quantity"'
}

// Require based on waste type selection
expressions: {
  'props.required': 'model.wasteTypes?.includes("hazardous")'
}

// Disable in review mode
expressions: {
  'props.disabled': 'model.displayMode === "review"'
}

// Dynamic options from subsection data
expressions: {
  'props.options': () => this.data?.facilityTypes?.map(type => ({
    label: type.name,
    value: type.id
  }))
}

// Dynamic maxSelections based on context
expressions: {
  'props.maxSelections': () => this.data?.allowedSelectionCount || 5
}

// Enable search for large option sets
expressions: {
  'props.searchable': () => (this.data?.optionCount ?? 0) > 10
}
```

## Managing Inter-Component Dependencies (Formly-First Approach)

**CRITICAL PRINCIPLE**: When one Formly component affects another component's data, behavior, or visibility, **prefer using Formly's declarative features** (expressions, hooks, validators) over Angular reactive form methods (`patchValue`, `setValue`, `valueChanges`).

### Why Formly-First?

1. **Declarative**: Logic is co-located with field definitions, making dependencies explicit
2. **Reactive**: Formly automatically handles change detection and updates
3. **Maintainable**: Easier to reason about field relationships
4. **Testable**: Less component logic to test
5. **Type-Safe**: Better integration with TypeScript and Zod schemas

### Pattern 1: Field Value Propagation with Expressions

Use `expressions` to reactively update field values based on other fields:

```typescript
// ❌ AVOID: Using Angular reactive forms
ngOnInit() {
  this.form.get('sourceField')?.valueChanges.subscribe(value => {
    this.form.get('dependentField')?.setValue(transformValue(value));
  });
}

// ✅ PREFER: Formly expressions
fields: FormlyFieldConfig[] = [
  {
    key: 'sourceField',
    type: 'text-input',
    props: { label: 'Source Field' }
  },
  {
    key: 'dependentField',
    type: 'text-input',
    props: { label: 'Dependent Field' },
    expressions: {
      // Automatically updates when sourceField changes
      'model.dependentField': 'model.sourceField?.toUpperCase()',
      // Or use function for complex logic
      'model.dependentField': (field: FormlyFieldConfig) => {
        const source = field.model?.sourceField;
        return source ? transformValue(source) : '';
      }
    }
  }
];
```

### Pattern 2: Conditional Field Visibility

```typescript
// ❌ AVOID: Imperatively showing/hiding fields
this.form.get('triggerField')?.valueChanges.subscribe(value => {
  if (value === 'option1') {
    this.showDependentField = true;
  } else {
    this.showDependentField = false;
    this.form.get('dependentField')?.reset();
  }
});

// ✅ PREFER: Formly hide expression
{
  key: 'dependentField',
  type: 'text-input',
  expressions: {
    hide: 'model.triggerField !== "option1"'
  },
  hooks: {
    onInit: (field) => {
      // Reset value when hidden
      return field.formControl?.valueChanges.pipe(
        tap(() => {
          if (field.hide) {
            field.formControl?.reset();
          }
        })
      );
    }
  }
}
```

### Pattern 3: Dynamic Options Based on Other Fields

```typescript
// ❌ AVOID: Manually updating options array
this.form.get('category')?.valueChanges.subscribe(category => {
  this.subcategoryOptions = this.getSubcategoriesFor(category);
  this.form.get('subcategory')?.reset();
});

// ✅ PREFER: Expression-driven options
{
  key: 'category',
  type: 'type-ahead',
  props: {
    label: 'Category',
    items: categoryList
  }
},
{
  key: 'subcategory',
  type: 'type-ahead',
  props: {
    label: 'Subcategory'
  },
  expressions: {
    // Dynamically update options based on category
    'props.items': (field: FormlyFieldConfig) => {
      const category = field.model?.category;
      return category ? this.getSubcategoriesFor(category) : [];
    },
    // Reset value when category changes
    'model.subcategory': (field: FormlyFieldConfig) => {
      const category = field.model?.category;
      const currentValue = field.formControl?.value;
      const validOptions = this.getSubcategoriesFor(category);

      // Clear if current value is not valid for new category
      if (currentValue && !validOptions.includes(currentValue)) {
        return null;
      }
      return currentValue;
    }
  }
}
```

### Pattern 4: Cross-Field Validation

```typescript
// ❌ AVOID: Manual validation in component
this.form.get('endDate')?.setValidators([
  (control) => {
    const startDate = this.form.get('startDate')?.value;
    return control.value < startDate ? { invalidRange: true } : null;
  }
]);

// ✅ PREFER: Formly validators with field references
{
  key: 'startDate',
  type: 'date-picker',
  props: { label: 'Start Date' }
},
{
  key: 'endDate',
  type: 'date-picker',
  props: { label: 'End Date' },
  validators: {
    dateRange: {
      expression: (control: AbstractControl, field: FormlyFieldConfig) => {
        const startDate = field.model?.startDate;
        const endDate = control.value;

        if (!startDate || !endDate) return true;
        return new Date(endDate) >= new Date(startDate);
      },
      message: 'End date must be after start date'
    }
  }
}
```

### Pattern 5: Computed Fields

```typescript
// ❌ AVOID: Subscribing and calculating in component
combineLatest([
  this.form.get('quantity')!.valueChanges,
  this.form.get('price')!.valueChanges
]).subscribe(([quantity, price]) => {
  this.form.get('total')?.setValue(quantity * price, { emitEvent: false });
});

// ✅ PREFER: Expression-based computation
{
  key: 'total',
  type: 'text-input',
  props: {
    label: 'Total',
    disabled: true // Read-only computed field
  },
  expressions: {
    'model.total': (field: FormlyFieldConfig) => {
      const quantity = field.model?.quantity || 0;
      const price = field.model?.price || 0;
      return (quantity * price).toFixed(2);
    }
  }
}
```

### Pattern 6: Cascading Resets

```typescript
// ❌ AVOID: Imperative reset chain
this.form.get('country')?.valueChanges.subscribe(() => {
  this.form.get('state')?.reset();
  this.form.get('city')?.reset();
  this.form.get('zipCode')?.reset();
});

// ✅ PREFER: Declarative expression chain
{
  key: 'country',
  type: 'type-ahead',
  props: { label: 'Country' }
},
{
  key: 'state',
  type: 'type-ahead',
  expressions: {
    'props.items': (field) => this.getStatesFor(field.model?.country),
    'model.state': (field) => {
      // Reset state when country changes
      const states = this.getStatesFor(field.model?.country);
      const current = field.formControl?.value;
      return states.includes(current) ? current : null;
    }
  }
},
{
  key: 'city',
  type: 'type-ahead',
  expressions: {
    'props.items': (field) => this.getCitiesFor(field.model?.state),
    'model.city': (field) => {
      const cities = this.getCitiesFor(field.model?.state);
      const current = field.formControl?.value;
      return cities.includes(current) ? current : null;
    }
  }
}
```

### Pattern 7: Multi-Select Dependencies

```typescript
// When a multi-select affects another field
{
  key: 'wasteTypes',
  type: 'multi-checkbox',
  props: {
    label: 'Waste Types',
    options: [
      { key: 'hazardous', label: 'Hazardous' },
      { key: 'nonHazardous', label: 'Non-Hazardous' }
    ]
  }
},
{
  key: 'hazardousDetails',
  type: 'text-input',
  expressions: {
    hide: (field) => {
      const selected = field.model?.wasteTypes?.selectedItems || [];
      return !selected.includes('hazardous');
    },
    'props.required': (field) => {
      const selected = field.model?.wasteTypes?.selectedItems || [];
      return selected.includes('hazardous');
    }
  },
  hooks: {
    onInit: (field) => {
      // Clear value when hidden
      return field.options?.formState?.wasteTypesChange$?.pipe(
        tap(() => {
          if (field.hide) {
            field.formControl?.reset();
          }
        })
      );
    }
  }
}
```

### Pattern 8: Using Hooks for Side Effects

When you need to perform actions beyond simple value updates:

```typescript
{
  key: 'triggerField',
  type: 'radio-buttons',
  props: {
    options: [
      { label: 'Option A', value: 'A' },
      { label: 'Option B', value: 'B' }
    ]
  },
  hooks: {
    onInit: (field) => {
      // Use hooks for side effects, not for value propagation
      return field.formControl?.valueChanges.pipe(
        tap((value) => {
          // Acceptable: Triggering analytics, logging, etc.
          this.trackFieldChange('triggerField', value);

          // Acceptable: Loading data asynchronously
          if (value === 'B') {
            this.loadAdditionalData().subscribe();
          }
        })
      );
    }
  }
}
```

### Pattern 9: Field Array Dependencies

```typescript
// When repeat fields affect each other
{
  key: 'items',
  type: 'repeat-type',
  props: { addMoreText: 'Add Item' },
  fieldArray: {
    fieldGroup: [
      {
        key: 'quantity',
        type: 'text-input',
        props: { label: 'Quantity', type: 'number' }
      },
      {
        key: 'price',
        type: 'text-input',
        props: { label: 'Price', type: 'number' }
      },
      {
        key: 'subtotal',
        type: 'text-input',
        props: { label: 'Subtotal', disabled: true },
        expressions: {
          // Access parent array index via field.parent
          'model.subtotal': (field) => {
            const index = field.parent?.key;
            const item = field.model;
            return ((item?.quantity || 0) * (item?.price || 0)).toFixed(2);
          }
        }
      }
    ]
  }
}
```

### Pattern 10: Cross-Field Validation in Repeat Fields

When you need to validate relationships between multiple fields within each item of a repeat-type array (e.g., ensuring "high value" is greater than or equal to "low value"):

```typescript
{
  key: 'physicalDescriptions',
  type: 'repeat-type',
  props: {
    addMoreText: 'Add Another Row',
    required: true,
    minRows: 1
  },
  fieldArray: {
    fieldGroupClassName: 'row g-3',
    // Validators at fieldArray level apply to the entire group of fields
    validators: {
      greaterThanOrEqualToLow: {
        errorPath: 'highPercent', // Where to display the error message
        expression: (control: AbstractControl) => {
          // Access individual field values within the group
          const lowPercent = control.get('lowPercent')?.value;
          const highPercent = control.get('highPercent')?.value;

          // Skip validation if either value is empty (allow incomplete state)
          if (!lowPercent || !highPercent) return true;

          // Validate the relationship between fields
          return parseFloat(highPercent) >= parseFloat(lowPercent);
        },
        message: 'High % must be greater than or equal to Low %',
      },
    },
    fieldGroup: [
      {
        key: 'physicalDescription',
        type: 'text-input',
        className: 'col-12 col-md-6',
        props: {
          label: 'Physical Description',
          placeholder: 'Enter description',
          required: true
        }
      },
      {
        key: 'lowPercent',
        type: 'text-input',
        className: 'col-12 col-md-3',
        props: {
          label: 'Low %',
          placeholder: 'Low %',
          type: 'number',
          step: 0.01,
          min: 0,
          max: 100,
          required: true
        }
      },
      {
        key: 'highPercent',
        type: 'text-input',
        className: 'col-12 col-md-3',
        props: {
          label: 'High %',
          placeholder: 'High %',
          type: 'number',
          step: 0.01,
          min: 0,
          max: 100,
          required: true
        }
      }
    ]
  }
}
```

**Key Concepts:**

1. **Validator Placement**: Place validators on `fieldArray` (not individual fields) to validate relationships between multiple fields in the same row
2. **errorPath**: Specifies which field should display the error message (typically the dependent field)
3. **control.get()**: Access sibling fields within the same row using `control.get('fieldKey')`
4. **Skip Incomplete State**: Return `true` when fields are empty to allow users to fill forms progressively
5. **Multiple Validators**: You can add multiple cross-field validators to the same fieldArray

**Alternative Pattern - Field-Level Cross-Validation:**

If you need to validate against a field outside the current row, use field-level validators with parent model access:

```typescript
{
  key: 'highPercent',
  type: 'text-input',
  validators: {
    compareToLow: {
      expression: (control: AbstractControl, field: FormlyFieldConfig) => {
        // Access sibling field via parent model
        const lowPercent = field.parent?.model?.lowPercent;
        const highPercent = control.value;

        if (!lowPercent || !highPercent) return true;

        return parseFloat(highPercent) >= parseFloat(lowPercent);
      },
      message: 'High % must be greater than or equal to Low %'
    }
  }
}
```

**When to Use Each Approach:**

- **fieldArray validators**: When validating relationships between multiple fields in the same repeat row (recommended for cleaner code)
- **Field-level validators**: When a single field needs complex validation logic or needs to access fields outside its row

### When Angular Reactive Forms ARE Acceptable

Only use reactive form methods when:

1. **Integration with non-Formly components**: External form controls
2. **Complex async operations**: Multi-step API calls with complex state
3. **Performance optimization**: Very high-frequency updates that need debouncing
4. **Third-party library integration**: Libraries that require direct form control access

Even in these cases, encapsulate the logic in a service or utility function, not inline in the component.

### Best Practices for Inter-Component Dependencies

1. **Model as Single Source of Truth**: All field values should derive from `model`
2. **Expressions Over Hooks**: Use expressions for value/prop updates; hooks for side effects only
3. **Avoid Circular Dependencies**: Field A → Field B → Field C, not A ↔ B
4. **Clear Dependency Order**: Place dependent fields after their dependencies in the array
5. **Test Expression Logic**: Extract complex expression functions and unit test them
6. **Document Dependencies**: Use comments to explain non-obvious field relationships

```typescript
// Good: Documented dependency chain
fields: FormlyFieldConfig[] = [
  {
    key: 'generatorType', // 1. Primary selector
    type: 'radio-buttons',
    props: { /* ... */ }
  },
  {
    key: 'generatorSubtype', // 2. Depends on generatorType
    type: 'type-ahead',
    expressions: {
      'props.items': (field) => this.getSubtypesFor(field.model?.generatorType)
    }
  },
  {
    key: 'specificRequirements', // 3. Depends on both generatorType and subtype
    type: 'multi-checkbox',
    expressions: {
      hide: (field) => !field.model?.generatorType || !field.model?.generatorSubtype,
      'props.options': (field) => {
        return this.getRequirementsFor(
          field.model?.generatorType,
          field.model?.generatorSubtype
        );
      }
    }
  }
];
```

## Data Models and Binding

### Standard Form Models

```typescript
// Text inputs, selects, dates
model = {
  companyName: '',
  contactEmail: '',
  selectedDate: null,
};

// Dropdown-checkbox (string array)
model = {
  hazardousComponents: ['lead', 'mercury'], // array of selected keys
};

// Multi-checkbox (note nested structure)
model = {
  wasteTypes: { selectedItems: ['hazardous', 'recyclable'] },
};

// Table-checkbox (T/F values)
model = {
  tableSelections: {
    item1: 'T',
    item2: 'F',
  },
};

// Type-ahead (object selection)
model = {
  selectedFacility: null, // will hold selected object
};

// Repeat arrays
model = {
  contacts: [{ name: '', email: '' }], // array of objects
};
```

## Custom Validators

### EPA ID Example

```typescript
validators: {
  epaId: {
    expression: (c) => !c.value || /^[A-Z]{2}\d{7}$/.test(c.value),
    message: 'EPA ID format: XX1234567'
  }
}
```

### Table Checkbox Validator

```typescript
// Automatically applied when required: true
// Validates at least one selection exists
// Built-in: requiredTableCheckboxValidator()
```

## Zod Schema and Model Alignment Best Practices

### Schema Construction Patterns

The `CORGeneratorSpecificationsSchema` demonstrates advanced patterns for building type-safe, conditional validation schemas:

#### 1. Layered Schema Architecture

```typescript
// Base schema with common fields
const BaseSchema = z.object({
  commonField1: z.string().optional(),
  commonField2: z.array(z.string()).optional(),
});

// Mode-specific schemas
const ModeASchema = BaseSchema.extend({
  mode: z.literal('modeA'),
});

const ModeBSchema = BaseSchema.extend({
  mode: z.literal('modeB'),
  // Additional required fields for mode B
  requiredForModeB: z.string(),
});

// Final union
const FinalSchema = z.union([ModeASchema, ModeBSchema]);
```

#### 2. Conditional Field Validation with Unions

For fields that are required/optional based on other field values:

```typescript
// Individual conditional schemas
const WithFeatureSchema = z.object({
  hasFeature: z.literal('T'),
  featureValue: z.number().min(0).max(100), // Required when 'T'
});

const WithoutFeatureSchema = z.object({
  hasFeature: z.literal('F'),
  featureValue: z.number().min(0).max(100).optional(), // Optional when 'F'
});

// Union for the conditional behavior
const FeatureUnion = z.union([WithFeatureSchema, WithoutFeatureSchema]);

// Combine with base schema
const CombinedSchema = BaseSchema.and(FeatureUnion);
```

#### 3. Complex Multi-Component Schemas

```typescript
// Multiple independent conditional validations
const ConditionalSchema = BaseSchema.and(ConditionAUnion) // Field A + its dependencies
  .and(ConditionBUnion) // Field B + its dependencies
  .and(ConditionCUnion); // Field C + its dependencies
```

### Model-Form Alignment Requirements

#### 1. BaseSubsection Type Parameter

```typescript
export class MySubsectionComponent extends BaseSubsection<MySchemaType> {
  // The generic type MUST match your Zod schema's inferred type
  override model: MySchemaType = {
    // Initialize all required fields
    // Match the schema's conditional requirements
  };
}
```

#### 2. Conditional Field Initialization

```typescript
// For schemas with conditional requirements, initialize appropriately
model: CORGeneratorSpecifications = {
  // Base fields (always present)
  requestedTechnology: '',
  requestedFacilityOrState: [],
  otherSpecificRestrictions: '',

  // Mode selection (determines which union branch)
  thermalProcessing: 'no', // or 'yes'

  // Conditional fields (when thermalProcessing === 'yes')
  // Initialize with appropriate defaults but ensure TypeScript compatibility
  // Note: These will be type-safe based on the union
};
```

#### 3. Formly Expression Alignment

Formly expressions MUST match the Zod schema's conditional logic:

```typescript
// Zod schema has literal 'T' requiring field
const WithVolumeSchema = z.object({
  hasVolume: z.literal('T'),
  volumePercent: z.number().min(0).max(100), // Required
});

// Formly field MUST use same condition
{
  key: 'volumePercent',
  type: 'text-input',
  expressions: {
    'props.required': 'model.hasVolume === "T"', // MUST match schema
    hide: 'model.hasVolume !== "T"' // Hide when not required
  }
}
```

#### 4. Multi-Checkbox Component Alignment

```typescript
// Zod schema for multi-checkbox
const MultiSelectSchema = z.object({
  checkboxField: z.object({
    selectedItems: z.array(z.enum(['option1', 'option2'])).min(1)
  })
});

// Formly field structure MUST match
{
  key: 'checkboxField', // Matches schema key
  type: 'multi-checkbox',
  props: {
    options: [
      { key: 'option1', label: 'Option 1' }, // key matches enum values
      { key: 'option2', label: 'Option 2' }
    ]
  }
}

// Model initialization
model = {
  checkboxField: { selectedItems: [] } // Matches nested structure
};
```

### Validation Message Alignment

```typescript
// In Formly field configuration
validation: {
  messages: {
    required: 'This field is required when X is selected', // Match business rules
    min: (error, field) => `Minimum value is ${field.props?.min}`, // Match schema constraints
    max: (error, field) => `Maximum value is ${field.props?.max}`
  }
}
```

### Schema Testing Requirements

1. **Test All Union Branches**: Ensure each conditional path validates correctly
2. **Test Boundary Conditions**: Min/max values, required/optional states
3. **Test Cross-Field Dependencies**: When field A affects field B's validation

```typescript
// Example test structure
describe('ConditionalSchema', () => {
  it('should require volumePercent when hasVolume is T', () => {
    const invalidData = { hasVolume: 'T' }; // missing volumePercent
    expect(() => schema.parse(invalidData)).toThrow();
  });

  it('should allow missing volumePercent when hasVolume is F', () => {
    const validData = { hasVolume: 'F' };
    expect(() => schema.parse(validData)).not.toThrow();
  });
});
```

## Best Practices

1. **Field Keys**: Use descriptive names (`generatorCompanyName` not `company`)
2. **Automation IDs**: Always include `data-automation-id` for testing
3. **Responsive**: Use Bootstrap grid (`col-12 col-md-*`) for mobile-first
4. **Validation**: Provide clear, actionable error messages
5. **Accordion Pattern**: All subsections must use accordion wrapper
6. **Phone Fields**: Use `digitalPlatformPhoneFormat` attribute for auto-formatting
7. **Performance**: Limit type-ahead with `maxItems`, use debouncing for search
8. **Inter-Component Dependencies**: **Always prefer Formly expressions, validators, and hooks over Angular reactive form methods** (`patchValue`, `setValue`, `valueChanges`). See "Managing Inter-Component Dependencies" section for patterns and examples.
9. **Schema Alignment**:
   - BaseSubsection generic type MUST match Zod schema inferred type
   - Formly expressions MUST match Zod conditional logic exactly
   - Model initialization MUST satisfy schema requirements
   - Multi-checkbox structure MUST match `{ selectedItems: [...] }` pattern
   - Test all union branches and conditional validations
10. **Dropdown-Checkbox**:

- Use `searchable: true` for lists with >10 options
- Set `maxSelections` to prevent overwhelming UI
- Use `showSelectedCount` for better UX with multiple selections
- Provide `description` for complex options that need clarification

## Component Integration

### Subsection Structure

```typescript
export class GeneratorContactComponent extends BaseSubsection {
  override title = 'Contact Information';
  override id = 'generator-contact';

  fields: FormlyFieldConfig[] = [
    /* accordion wrapper with fields */
  ];
  model = { contactName: '', email: '', phone: '' };
}
```

### Section Structure

```typescript
export class GeneratorInformationComponent extends BaseSection {
  override sectionTitle = 'Generator Information';
  override subsections = ['generator-contact', 'generator-address'];
}
```
