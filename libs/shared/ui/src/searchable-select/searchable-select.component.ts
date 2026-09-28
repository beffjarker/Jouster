import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostListener,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * A reusable searchable dropdown select component.
 *
 * Replaces native `<select>` elements with a filterable dropdown panel.
 * Supports keyboard navigation, outside-click-to-close, and match count display.
 *
 * @example
 * ```html
 * <jstr-searchable-select
 *   [options]="['apple', 'banana', 'cherry']"
 *   [selected]="selectedFruit"
 *   placeholder="All Fruits"
 *   searchPlaceholder="Filter fruits..."
 *   (selectionChange)="onFruitChange($event)">
 * </jstr-searchable-select>
 * ```
 */
@Component({
  selector: 'jstr-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.scss'],
})
export class SearchableSelectComponent implements OnChanges {
  @Input() options: string[] = [];
  @Input() selected = '';
  @Input() placeholder = 'All';
  @Input() searchPlaceholder = 'Search...';
  @Output() selectionChange = new EventEmitter<string>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  public isOpen = false;
  public searchTerm = '';
  public filteredOptions: string[] = [];
  public highlightIndex = -1;

  constructor(private elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filterOptions();
    }
  }

  /** Toggle dropdown open/closed. */
  public toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  /** Open the dropdown and focus the search input. */
  public open(): void {
    this.isOpen = true;
    this.searchTerm = '';
    this.highlightIndex = -1;
    this.filterOptions();
    setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0);
  }

  /** Close the dropdown. */
  public close(): void {
    this.isOpen = false;
    this.searchTerm = '';
    this.highlightIndex = -1;
  }

  /** Select an option and emit the change. */
  public select(value: string): void {
    this.selectionChange.emit(value);
    this.close();
  }

  /** Filter options based on the search term. */
  public filterOptions(): void {
    if (!this.searchTerm) {
      this.filteredOptions = [...this.options];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredOptions = this.options.filter(opt =>
        opt.toLowerCase().includes(term)
      );
    }
    this.highlightIndex = -1;
  }

  /** Handle keyboard navigation within the dropdown. */
  public onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        // -1 = placeholder ("All"), 0+ = filteredOptions indices
        if (this.highlightIndex < this.filteredOptions.length - 1) {
          this.highlightIndex++;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.highlightIndex > -1) {
          this.highlightIndex--;
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightIndex === -1) {
          this.select('');
        } else if (this.highlightIndex < this.filteredOptions.length) {
          this.select(this.filteredOptions[this.highlightIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  /** Close dropdown when clicking outside the component. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  /** Display label for the trigger button. */
  public get displayLabel(): string {
    return this.selected || this.placeholder;
  }
}

