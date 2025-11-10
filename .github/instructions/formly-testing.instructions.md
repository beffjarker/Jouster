# Formly Elements Testing Instructions

**Note:** All general Jest & Angular testing best practices in `testing-best-practices.instructions.md` also apply to Formly elements. Follow those instructions in addition to the Formly-specific guidance below.

**Scope:** This file applies to any file located in a `formly-elements` directory (including all subfolders and files) in the codebase. It is intended for use by Copilot and all contributors when working within Formly element code, including both agent mode and edit mode.

---

## General Principles

- All Formly element code (custom field types, wrappers, directives, etc.) must be tested with a focus on:
  - Correct rendering and binding of inputs/outputs
  - Integration with Formly's configuration and Angular forms
  - Accessibility and keyboard navigation
  - Custom logic, validation, and dynamic behavior
- Use Spectator and Angular TestBed for component and directive tests.
- Use Formly's official testing utilities where possible (see below).
- Place test files alongside the code, using `.spec.ts` suffix.
- Target at least 90% code coverage for all `.ts` and `.spec.ts` files in `formly-elements`.

---

## Formly Testing Utilities

- Import `FormlyInputModule` and other Formly test modules from `@ngx-formly/core/testing` as needed.
- Use Formly's test components (e.g., `formly-test-component`) to create isolated test scenarios.
- See the [Formly Testing API docs](https://formly.dev/docs/api/core/testing/) for available helpers and patterns.

---

## Best Practices for Testing Formly Elements

- Always test:
  - Rendering of the custom field/component with various Formly config options
  - Input bindings (e.g., `props`, `formControl`, `formState`)
  - Output events and custom event emitters
  - Conditional logic (e.g., dynamic visibility, validation, wrappers)
  - Integration with Angular forms (ReactiveFormsModule)
  - Edge cases (empty, null, invalid config)
- Use Spectator's helpers for DOM queries and event simulation.
- Use Formly's test harnesses to simulate field configuration and rendering.
- Mock external dependencies and services as needed.
- For wrappers, test both the wrapper logic and the wrapped field/component.
- For directives, test with and without the directive applied.
- For accessibility, verify ARIA attributes, tab order, and keyboard navigation.
- For custom validators, test both valid and invalid scenarios.

---

## Formly Test Utilities: API Overview

When using `createFieldComponent` from `@ngx-formly/core/testing`, the returned object provides several utilities for advanced and custom test scenarios:

- `fixture`: The Angular `ComponentFixture` for low-level access.
- `detectChanges()`: Triggers Angular change detection.
- `setInputs(props)`: Updates the field config or other inputs and triggers change detection.
- `query(selector)`: Returns a debug element for a CSS selector (e.g., `'input[type="checkbox"]'`).
- `queryAll(selector)`: Returns all debug elements for a selector.
- Direct access to the `field` input (e.g., `utils.field`).

Use these utilities to:

- Select and assert on DOM elements and their properties/attributes.
- Update the field configuration and re-render the component.
- Manually trigger change detection after state changes.
- Access and manipulate the test fixture for advanced scenarios.

---

## Example: Checkbox Field Testing (from official Formly)

```typescript
import { FormlyFieldConfig } from '@ngx-formly/core';
import { createFieldComponent, ɵCustomEvent } from '@ngx-formly/core/testing';
import { FormlyBootstrapCheckboxModule } from '@ngx-formly/bootstrap/checkbox';

const renderComponent = (field: FormlyFieldConfig) => {
  return createFieldComponent(field, {
    imports: [FormlyBootstrapCheckboxModule],
  });
};

describe('ui-bootstrap: Checkbox Type', () => {
  it('should render checkbox type', () => {
    const { query } = renderComponent({
      key: 'name',
      type: 'checkbox',
    });
    expect(query('formly-wrapper-form-field')).not.toBeNull();
    const { properties, attributes, classes } = query('input[type="checkbox"]');
    expect(classes).toMatchObject({ 'form-check-input': true });
    expect(attributes).toMatchObject({
      id: 'formly_1_checkbox_name_0',
      type: 'checkbox',
    });
  });

  it('should set aria-invalid to true on invalid', () => {
    const { query } = renderComponent({
      key: 'name',
      type: 'checkbox',
      validation: { show: true },
      props: { required: true },
    });
    expect(
      query('input[type="checkbox"]').nativeElement.getAttribute('aria-invalid')
    ).toBe('true');
  });

  it('should bind control value on change', () => {
    const changeSpy = jest.fn();
    const { query, field, detectChanges } = renderComponent({
      key: 'name',
      type: 'checkbox',
      props: { change: changeSpy },
    });
    const inputDebugEl = query<HTMLInputElement>('input[type="checkbox"]');
    inputDebugEl.triggerEventHandler('change', ɵCustomEvent({ checked: true }));
    detectChanges();
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(field.formControl.value).toBeTrue();
    inputDebugEl.triggerEventHandler(
      'change',
      ɵCustomEvent({ checked: false })
    );
    detectChanges();
    expect(changeSpy).toHaveBeenCalledTimes(2);
    expect(field.formControl.value).toBeFalse();
  });
});
```

---

## References

- [Formly Testing API](https://formly.dev/docs/api/core/testing/)
- [Formly UI Source Examples](https://github.com/ngx-formly/ngx-formly/tree/main/src/ui)
- [Spectator Documentation](https://ngneat.github.io/spectator/)

---

**Include this file in Copilot/LLM references for any work in `formly-elements`.**
