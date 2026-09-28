import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SearchableSelectComponent } from './searchable-select.component';

describe('SearchableSelectComponent', () => {
  let component: SearchableSelectComponent;
  let fixture: ComponentFixture<SearchableSelectComponent>;

  const testOptions = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelectComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchableSelectComponent);
    component = fixture.componentInstance;
    component.options = testOptions;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dropdown closed', () => {
    expect(component.isOpen).toBe(false);
  });

  it('should open dropdown on toggle', () => {
    component.toggle();
    expect(component.isOpen).toBe(true);
  });

  it('should close dropdown on second toggle', () => {
    component.open();
    component.toggle();
    expect(component.isOpen).toBe(false);
  });

  it('should show all options when opened with no search term', () => {
    component.open();
    expect(component.filteredOptions.length).toBe(testOptions.length);
  });

  it('should filter options by search term (case-insensitive)', () => {
    component.open();
    component.searchTerm = 'ER';
    component.filterOptions();
    expect(component.filteredOptions).toEqual(['cherry', 'elderberry']);
  });

  it('should show no results for non-matching search', () => {
    component.open();
    component.searchTerm = 'zzz';
    component.filterOptions();
    expect(component.filteredOptions.length).toBe(0);
  });

  it('should emit selectionChange on select', () => {
    const spy = jest.spyOn(component.selectionChange, 'emit');
    component.select('banana');
    expect(spy).toHaveBeenCalledWith('banana');
  });

  it('should close dropdown after selection', () => {
    component.open();
    component.select('banana');
    expect(component.isOpen).toBe(false);
  });

  it('should emit empty string when clearing selection', () => {
    const spy = jest.spyOn(component.selectionChange, 'emit');
    component.select('');
    expect(spy).toHaveBeenCalledWith('');
  });

  it('should close on Escape key', () => {
    component.open();
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpen).toBe(false);
  });

  it('should navigate options with ArrowDown', () => {
    component.open();
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.highlightIndex).toBe(0);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.highlightIndex).toBe(1);
  });

  it('should navigate options with ArrowUp', () => {
    component.open();
    component.highlightIndex = 2;
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.highlightIndex).toBe(1);
  });

  it('should not go below -1 with ArrowUp', () => {
    component.open();
    component.highlightIndex = 0;
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.highlightIndex).toBe(-1);
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.highlightIndex).toBe(-1);
  });

  it('should select highlighted option on Enter', () => {
    const spy = jest.spyOn(component.selectionChange, 'emit');
    component.open();
    component.highlightIndex = 2;
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledWith('cherry');
  });

  it('should select placeholder (clear) on Enter when highlightIndex is -1', () => {
    const spy = jest.spyOn(component.selectionChange, 'emit');
    component.open();
    component.highlightIndex = -1;
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledWith('');
  });

  it('should display selected value in trigger label', () => {
    component.selected = 'banana';
    expect(component.displayLabel).toBe('banana');
  });

  it('should display placeholder when no selection', () => {
    component.selected = '';
    component.placeholder = 'All Tags';
    expect(component.displayLabel).toBe('All Tags');
  });

  it('should close on outside click', () => {
    component.open();
    const outsideEvent = new Event('click');
    Object.defineProperty(outsideEvent, 'target', { value: document.body });
    component.onDocumentClick(outsideEvent);
    expect(component.isOpen).toBe(false);
  });

  it('should reset search term when closing', () => {
    component.open();
    component.searchTerm = 'test';
    component.close();
    expect(component.searchTerm).toBe('');
  });

  it('should handle special characters in search', () => {
    component.options = ['date-approximate', "o'connor", 'air force'];
    component.open();
    component.searchTerm = "o'c";
    component.filterOptions();
    expect(component.filteredOptions).toEqual(["o'connor"]);
  });

  it('should handle empty options list', () => {
    component.options = [];
    component.open();
    expect(component.filteredOptions.length).toBe(0);
  });
});

