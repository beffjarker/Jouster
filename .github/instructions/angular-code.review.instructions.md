---
applyTo: '**/*.{html,scss,component.ts,service.ts,directive.ts,pipe.ts,guard.ts,module.ts,interceptor.ts,resolver.ts}'
---

# Angular Code Review Guidelines

This document provides comprehensive guidelines for reviewing Angular code to catch code smells, performance issues, and architectural problems that cannot be detected by linting rules. Use this as a checklist when reviewing Angular components, services, directives, pipes, and related TypeScript files.

---

## Memory Leaks & Subscription Management

> **Preferred Approach:** Always use `@UntilDestroy()` decorator for subscription management in this codebase, as it's available across all projects and provides cleaner, more maintainable code than manual cleanup patterns.

### 🔍 **Look For These Issues:**

- **Missing Unsubscribe Patterns**: Components that subscribe to Observables without proper cleanup
- **Manual Subscription Management**: Using `.subscribe()` without corresponding unsubscribe logic
- **Using takeUntil when @UntilDestroy is available**: Prefer the decorator for cleaner code
- **Event Listener Leaks**: Browser event listeners not removed in `ngOnDestroy`
- **Timer/Interval Leaks**: `setInterval`, `setTimeout`, or RxJS interval operators without cleanup

### ✅ **Proper Patterns:**

```typescript
// BEST: Using async pipe (preferred - no subscription management needed)
export class MyComponent {
  data$ = this.dataService.data$;
}
// In template: {{ data$ | async }}

// PREFERRED: Using @UntilDestroy decorator (available across codebase)
@UntilDestroy()
@Component({...})
export class MyComponent implements OnInit {
  ngOnInit() {
    this.dataService.data$
      .pipe(untilDestroyed(this))
      .subscribe(data => { /* handle data */ });
  }
  // No ngOnDestroy needed - @UntilDestroy handles cleanup automatically
}

// ACCEPTABLE: Manual takeUntil pattern (when @UntilDestroy not suitable)
export class MyComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject<void>();

  ngOnInit() {
    this.dataService.data$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(data => { /* handle data */ });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: No unsubscribe - memory leak!
export class BadComponent implements OnInit {
  ngOnInit() {
    this.dataService.data$.subscribe((data) => {
      /* memory leak! */
    });
  }
}

// Bad: Manual subscription without proper cleanup
export class BadComponent implements OnInit {
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.dataService.data$.subscribe((data) => {});
    // Missing: ngOnDestroy to unsubscribe
  }
}

// Discouraged: Manual takeUntil when @UntilDestroy is available
export class DiscourageComponent implements OnInit, OnDestroy {
  private destroyed$ = new Subject<void>();

  ngOnInit() {
    // Should use @UntilDestroy decorator instead for cleaner code
    this.dataService.data$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((data) => {});
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
```

---

## Change Detection & Performance

### 🔍 **Look For These Issues:**

- **Expensive Template Operations**: Complex logic, method calls, or calculations in templates
- **Inefficient TrackBy Functions**: Missing `trackBy` functions in `*ngFor` loops with dynamic data
- **Unnecessary Change Detection Triggers**: Operations that trigger change detection unnecessarily

### ✅ **Proper Patterns:**

```typescript
// Good: TrackBy functions for performance
@Component({
  selector: 'app-my-component',
  template: `
    <div *ngFor="let item of items; trackBy: trackByFn">
      {{ item.name }}
    </div>
  `,
})
export class MyComponent {
  @Input() items: Item[] = [];

  trackByFn(index: number, item: Item): string {
    return item.id; // Use unique identifier
  }
}

// Good: Computed properties instead of methods in templates
export class MyComponent {
  get computedValue() {
    return this.someExpensiveCalculation();
  }
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: Method calls in templates
@Component({
  template: `
    <div>{{ calculateExpensiveValue() }}</div> <!-- Called on every change detection! -->
  `
})

// Bad: Missing trackBy
@Component({
  template: `
    <div *ngFor="let item of largeArray">{{ item.name }}</div> <!-- Performance issue -->
  `
})

// Bad: Complex logic in templates
@Component({
  template: `
    <div>{{ user?.profile?.settings?.theme || 'default' }}</div> <!-- Use getter/property -->
  `
})
```

---

## Component Architecture & Design

### 🔍 **Look For These Issues:**

- **Bloated Components**: Components with too many responsibilities
- **Direct HTTP Calls**: Components making HTTP requests directly instead of using services
- **Business Logic in Components**: Complex business logic mixed with presentation logic
- **Tightly Coupled Components**: Components that know too much about their children/parents
- **Missing Input/Output Validation**: No validation or type checking for component inputs

### ✅ **Proper Patterns:**

```typescript
// Good: Focused, single-responsibility component
@Component({
  selector: 'app-user-profile',
  template: `...`
})
export class UserProfileComponent implements OnInit {
  @Input() userId!: string;
  @Output() profileUpdated = new EventEmitter<UserProfile>();

  profile$ = this.userId ? this.userService.getProfile(this.userId) : EMPTY;

  constructor(private userService: UserService) {}

  onUpdateProfile(profile: UserProfile) {
    this.profileUpdated.emit(profile);
  }
}

// Good: Input validation
@Component({...})
export class MyComponent implements OnChanges {
  @Input() requiredData!: RequiredType;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requiredData'] && !this.requiredData) {
      console.warn('requiredData is required but not provided');
    }
  }
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: Component doing too much
@Component({...})
export class BadComponent {
  constructor(private http: HttpClient) {} // Should use service

  loadData() {
    return this.http.get('/api/data') // HTTP logic in component
      .pipe(
        map(data => this.processBusinessLogic(data)), // Business logic in component
        tap(data => this.updateAnalytics(data)) // Side effects in component
      );
  }

  processBusinessLogic(data: any) { /* 50 lines of business logic */ }
  updateAnalytics(data: any) { /* Analytics logic in component */ }
}
```

---

## State Management & Data Flow

### 🔍 **Look For These Issues:**

- **Mutating Input Properties**: Directly modifying `@Input()` properties
- **Shared Mutable State**: Components sharing and mutating objects
- **Inconsistent State Updates**: State changes that don't follow predictable patterns
- **Missing Reactive Patterns**: Imperative code where reactive would be better

### ✅ **Proper Patterns:**

```typescript
// Good: Immutable updates
@Component({...})
export class MyComponent {
  @Input() items: Item[] = [];

  updateItem(updatedItem: Item) {
    // Don't mutate input directly
    const newItems = this.items.map(item =>
      item.id === updatedItem.id ? { ...item, ...updatedItem } : item
    );
    this.itemsUpdated.emit(newItems);
  }
}

// Good: Reactive patterns
export class MyComponent {
  searchTerm$ = new BehaviorSubject<string>('');

  results$ = this.searchTerm$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.searchService.search(term))
  );
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: Mutating inputs
@Component({...})
export class BadComponent {
  @Input() items: Item[] = [];

  addItem(item: Item) {
    this.items.push(item); // Mutating input!
  }
}

// Bad: Imperative state management
export class BadComponent {
  results: any[] = [];
  loading = false;

  search(term: string) {
    this.loading = true;
    this.searchService.search(term).subscribe(results => {
      this.results = results;
      this.loading = false;
    }); // Should be reactive
  }
}
```

---

## Error Handling & Edge Cases

### 🔍 **Look For These Issues:**

- **Missing Error Handling**: No `catchError` operators in Observable chains
- **Silent Failures**: Errors that are caught but not handled appropriately
- **Missing Loading States**: No indication of async operations in progress
- **Unchecked Null/Undefined**: Accessing properties without null checks

### ✅ **Proper Patterns:**

```typescript
// Good: Proper error handling
export class MyComponent {
  data$ = this.dataService.getData().pipe(
    catchError((error) => {
      this.errorService.handleError(error);
      return of([]); // Fallback value
    })
  );

  // Good: Safe property access
  get userName(): string {
    return this.user?.profile?.name ?? 'Anonymous';
  }
}

// Good: Loading states
export class MyComponent {
  isLoading$ = new BehaviorSubject<boolean>(false);

  loadData() {
    this.isLoading$.next(true);
    return this.dataService
      .getData()
      .pipe(finalize(() => this.isLoading$.next(false)));
  }
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: No error handling
export class BadComponent {
  ngOnInit() {
    this.dataService.getData().subscribe((data) => {
      // What if this fails?
      this.data = data;
    });
  }
}

// Bad: Unsafe property access
export class BadComponent {
  displayName() {
    return this.user.profile.name; // Will crash if user or profile is null
  }
}
```

---

## Template & View Best Practices

### 🔍 **Look For These Issues:**

- **Complex Template Logic**: Nested conditionals, complex expressions
- **Missing Accessibility**: No ARIA labels, roles, or keyboard navigation
- **Inline Styles**: Styling directly in templates instead of CSS files

### ✅ **Proper Patterns:**

```html
<!-- Good: Simple, readable templates -->
<div class="user-card" [class.active]="isActive">
  <h3>{{ user?.name || 'Unknown User' }}</h3>
  <button
    type="button"
    [attr.aria-label]="'Edit ' + user?.name"
    (click)="editUser()"
  >
    Edit
  </button>
</div>

<!-- Good: Using computed properties -->
<div *ngIf="shouldShowContent">Content here</div>
```

```typescript
// In component
get shouldShowContent(): boolean {
  return this.user?.isActive && this.hasPermission('read');
}
```

### ❌ **Anti-Patterns:**

```html
<!-- Bad: Complex logic in template -->
<div
  *ngIf="user && user.isActive && permissions && permissions.includes('read') && !isLoading"
>
  Content
</div>

<!-- Bad: Missing accessibility -->
<button (click)="doSomething()">Click</button>
<!-- No aria-label -->

<!-- Bad: Inline styles -->
<div style="color: red; font-size: 14px;">Error</div>
```

---

## Service & Dependency Injection

> **Preferred Approach:** Use the `inject()` function for dependency injection in new code, as it provides better tree-shaking, cleaner syntax, and better testability compared to constructor injection.

### 🔍 **Look For These Issues:**

- **Constructor Injection**: Using constructor injection instead of `inject()` function (newer pattern)
- **Singleton Violations**: Services that should be singletons but aren't
- **Circular Dependencies**: Services depending on each other
- **Missing providedIn**: Services not using `providedIn: 'root'` when appropriate
- **Over-injection**: Injecting too many dependencies into one service

### ✅ **Proper Patterns:**

```typescript
// PREFERRED: Using inject() function (modern Angular pattern)
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private users$ = new BehaviorSubject<User[]>([]);

  getUsers(): Observable<User[]> {
    return this.users$.asObservable();
  }

  loadUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users').pipe(
      tap((users) => this.users$.next(users)),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}

// ACCEPTABLE: Constructor injection (legacy pattern - still valid)
@Injectable({ providedIn: 'root' })
export class UserService {
  private users$ = new BehaviorSubject<User[]>([]);

  constructor(private http: HttpClient) {}

  // ... rest of implementation
}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: Missing providedIn
@Injectable() // Should have providedIn: 'root'
export class BadService {}

// Discouraged: Constructor injection for new code (prefer inject() function)
@Injectable({ providedIn: 'root' })
export class NewService {
  constructor(private http: HttpClient, private router: Router) {} // Should use inject() for new code
}

// Bad: Too many responsibilities
@Injectable()
export class GodService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private analytics: AnalyticsService,
    private notifications: NotificationService // ... 10 more dependencies
  ) {}

  // Does everything: HTTP, routing, auth, analytics, etc.
}
```

---

## Testing Considerations

### 🔍 **Look For These Issues:**

- **Untestable Code**: Components/services that are hard to test due to tight coupling
- **Missing Test Coverage**: Complex logic without corresponding tests
- **Integration Over Unit**: Testing too many things together

### ✅ **Proper Patterns:**

```typescript
// Good: Testable service
@Injectable()
export class UserService {
  constructor(private http: HttpClient) {}

  // Pure function - easy to test
  formatUserName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  // Injectable dependencies - easy to mock
  getUser(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

// Good: Testable component
@Component({...})
export class UserComponent {
  @Input() user!: User;
  @Output() userSelected = new EventEmitter<User>();

  // Pure method - easy to test
  onSelectUser() {
    this.userSelected.emit(this.user);
  }
}
```

---

## Performance Red Flags

### 🔍 **Review Checklist:**

- [ ] **Bundle Size**: Are imports efficient? Any unused imports?
- [ ] **Lazy Loading**: Are feature modules lazy-loaded appropriately?
- [ ] **TrackBy Functions**: Are ngFor loops using trackBy for large lists?
- [ ] **Subscription Management**: Are subscriptions properly managed?
- [ ] **Memory Leaks**: Are all resources cleaned up in ngOnDestroy?
- [ ] **Change Detection**: Are expensive operations avoided in templates?

---

## Security Considerations

### 🔍 **Look For These Issues:**

- **XSS Vulnerabilities**: Using `innerHTML` without sanitization
- **Unsafe Pipe Usage**: Using `| async` without null checks
- **Exposed Sensitive Data**: Logging or displaying sensitive information

### ✅ **Proper Patterns:**

```typescript
// Good: Safe HTML handling
constructor(private sanitizer: DomSanitizer) {}

sanitizeHtml(html: string) {
  return this.sanitizer.sanitize(SecurityContext.HTML, html);
}

// Good: Safe async pipe usage
{{ (user$ | async)?.name || 'Loading...' }}
```

### ❌ **Anti-Patterns:**

```typescript
// Bad: Unsafe HTML
element.innerHTML = userInput; // XSS vulnerability

// Bad: Unsafe async pipe
{
  {
    (user$ | async).name;
  }
} // Will error if user$ emits null
```

---

## Code Organization Red Flags

### 🔍 **Look For These Issues:**

- **Barrel Export Overuse**: Importing entire feature modules when only one service is needed
- **Circular Imports**: Modules importing each other
- **Inappropriate Module Boundaries**: Logic in wrong modules
- **Missing Lazy Loading**: Large feature modules loaded eagerly

---

## Future Improvements & Aspirational Patterns

_The following patterns represent best practices that should be adopted as the codebase evolves. While these are not currently enforced across all existing code, they should be considered for new features and gradual adoption in refactoring efforts._

### Change Detection Optimization

#### 🎯 **Future Goal: OnPush Strategy**

As the application grows, consider adopting `ChangeDetectionStrategy.OnPush` for performance-critical components:

```typescript
// Aspirational: OnPush strategy for performance
@Component({
  selector: 'app-my-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngFor="let item of items; trackBy: trackByFn">
      {{ item.name }}
    </div>
  `,
})
export class MyComponent {
  @Input() items: Item[] = [];

  trackByFn(index: number, item: Item): string {
    return item.id; // Use unique identifier
  }
}
```

**Benefits:**

- Improved performance for large component trees
- More predictable change detection cycles
- Better separation of concerns

**Migration Strategy:**

- Start with leaf components (no child components)
- Gradually work up the component tree
- Ensure all inputs are immutable
- Use observables with async pipe

### Internationalization (i18n)

#### 🎯 **Future Goal: Full i18n Support**

As the application expands to serve multiple markets, consider implementing comprehensive internationalization:

```typescript
// Aspirational: i18n-ready templates
@Component({
  template: `
    <button>{{ 'SAVE_CHANGES' | translate }}</button>
    <p>{{ 'WELCOME_MESSAGE' | translate: {name: userName} }}</p>
  `
})
```

```html
<!-- Instead of hardcoded text -->
<button>Save Changes</button>

<!-- Use translation keys -->
<button>{{ 'BUTTONS.SAVE_CHANGES' | translate }}</button>
```

**Implementation Considerations:**

- Audit existing hardcoded strings
- Establish translation key naming conventions
- Consider right-to-left (RTL) language support
- Plan for date/number formatting differences

**Migration Strategy:**

- Start with new features using i18n from the beginning
- Create inventory of existing hardcoded strings
- Prioritize user-facing text over internal/dev messages
- Consider automated string extraction tools

---

## Summary Checklist

When reviewing Angular code, ensure:

- [ ] Proper subscription management (prefer @UntilDestroy, then async pipe, then takeUntil)
- [ ] Modern dependency injection (prefer `inject()` function over constructor injection for new code)
- [ ] TrackBy functions for dynamic ngFor loops
- [ ] Proper error handling with catchError
- [ ] Input validation and null checks
- [ ] Single responsibility principle for components/services
- [ ] Reactive patterns over imperative code
- [ ] Accessibility considerations (ARIA, keyboard navigation)
- [ ] Testable code structure
- [ ] Security best practices
- [ ] Performance considerations (bundle size, lazy loading)
- [ ] Note which principle(s) are being violated and suggest improvements based on the guidelines above

---

## Resources

- [Angular Performance Checklist](https://web.dev/angular-performance-checklist/)
- [Angular Security Best Practices](https://angular.io/guide/security)
- [RxJS Best Practices](https://blog.angular-university.io/rxjs-error-handling/)
