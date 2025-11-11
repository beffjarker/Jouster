# Authentication-Based Menu Visibility - TODO

**Feature Branch**: `feature/auth-based-menu-visibility`  
**Status**: 🚧 Phase 1 Complete - Structure & Public Items  
**Next**: Phase 2 - Wire up authentication service

---

## ✅ Phase 1: Public Menu Items (COMPLETE)

### What Was Implemented

**Public Menu Items** (Always Visible):
- 🎨 **Flash Experiments** (`/`) - Home page with 56+ interactive presets
- ℹ️ **About** (`/about`) - About this project
- 📞 **Contact** (`/contact`) - Get in touch

**Auth-Required Items** (Hidden until logged in):
- ⭐ Highlights
- 📅 Timeline
- 💬 Conversations
- 🔢 Fibonacci
- 🎵 Music
- 📧 Emails

### Code Changes

**File**: `apps/jouster-ui/src/app/components/navigation/navigation.component.ts`

**Updates**:
1. Added `requiresAuth` and `isPublic` flags to `NavigationItem` interface
2. Marked public items with `isPublic: true`
3. Marked auth-required items with `requiresAuth: true`
4. Added `isAuthenticated` property (currently hardcoded to `false`)
5. Added `visibleNavigationItems` getter to filter items based on auth status

**File**: `apps/jouster-ui/src/app/components/navigation/navigation.component.html`

**Updates**:
1. Changed `*ngFor` to use `visibleNavigationItems` instead of all items

---

## 🚧 Phase 2: Wire Up Authentication (TODO)

### Tasks

#### 1. Create Authentication Service
```typescript
// apps/jouster-ui/src/app/services/auth.service.ts

export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Check for existing session (localStorage, JWT, etc.)
    this.checkAuthStatus();
  }

  login(username: string, password: string): Observable<boolean> {
    // TODO: Implement actual authentication
    // For now, simulate successful login
    return of(true);
  }

  logout(): void {
    // TODO: Implement logout logic
    this.isAuthenticatedSubject.next(false);
  }

  private checkAuthStatus(): void {
    // TODO: Check if user has valid session
    const hasSession = localStorage.getItem('authToken') !== null;
    this.isAuthenticatedSubject.next(hasSession);
  }
}
```

#### 2. Update Navigation Component to Use Auth Service
```typescript
// apps/jouster-ui/src/app/components/navigation/navigation.component.ts

constructor(
  private router: Router,
  private authService: AuthService // Inject auth service
) {}

ngOnInit() {
  // Subscribe to auth state changes
  this.authService.isAuthenticated$
    .pipe(takeUntil(this.destroy$))
    .subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });

  // ...existing code...
}
```

#### 3. Create Login Component
```bash
# Generate login component
nx generate @nx/angular:component components/login --project=jouster-ui
```

**Login Component Should Include**:
- Username/email input field
- Password input field
- "Remember me" checkbox
- Submit button
- Error message display
- Link to register (if applicable)

#### 4. Create Auth Guard for Protected Routes
```typescript
// apps/jouster-ui/src/app/guards/auth.guard.ts

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }
      // Redirect to login with return URL
      router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    })
  );
};
```

#### 5. Apply Guard to Protected Routes
```typescript
// apps/jouster-ui/src/app/app.routes.ts

export const routes: Route[] = [
  { path: '', component: HomeComponent }, // Public
  { path: 'about', component: AboutComponent }, // Public
  { path: 'contact', component: ContactComponent }, // Public
  { path: 'login', component: LoginComponent }, // Public
  
  // Protected routes
  { 
    path: 'highlights', 
    component: HighlightsComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'timeline', 
    component: TimelineComponent,
    canActivate: [authGuard] 
  },
  // ...more protected routes...
];
```

#### 6. Add Login/Logout Button to Navigation
```html
<!-- In navigation.component.html -->
<div class="nav-footer">
  <!-- Auth Status -->
  <div class="auth-status" *ngIf="!isAuthenticated">
    <button class="btn-login" routerLink="/login">
      🔐 Sign In
    </button>
  </div>

  <div class="auth-status" *ngIf="isAuthenticated">
    <p class="user-info">
      <span class="user-icon">👤</span>
      <span class="user-name">{{ currentUser?.name }}</span>
    </p>
    <button class="btn-logout" (click)="logout()">
      🚪 Sign Out
    </button>
  </div>

  <!-- ...existing footer content... -->
</div>
```

---

## 🎯 Authentication Options

### Option 1: Simple Session-Based Auth
- Store auth token in localStorage
- Simple login form
- No registration required initially
- Best for: Demo/prototype

### Option 2: JWT with Backend API
- JWT tokens for authentication
- Backend validates credentials
- Refresh token mechanism
- Best for: Production app

### Option 3: OAuth/Social Login
- Login with Google, GitHub, etc.
- No password management
- Better UX
- Best for: Public-facing app

### Option 4: Firebase Authentication
- Managed authentication service
- Email/password + social logins
- Built-in user management
- Best for: Quick production deployment

---

## 📋 Current Behavior

### When NOT Logged In (Current State)
**Visible Menu Items**:
- 🎨 Flash Experiments (home)
- ℹ️ About
- 📞 Contact

**Hidden Menu Items**:
- ⭐ Highlights
- 📅 Timeline
- 💬 Conversations
- 🔢 Fibonacci
- 🎵 Music
- 📧 Emails

### When Logged In (Future)
**All menu items will be visible**

---

## 🧪 Testing Checklist

### Phase 1 (Current - Manual Testing)
- [ ] Start app: `npm start` or `nx serve jouster-ui`
- [ ] Verify only 3 menu items visible (Flash Experiments, About, Contact)
- [ ] Navigate to each public page
- [ ] Verify navigation works correctly
- [ ] Test mobile hamburger menu
- [ ] Verify desktop sidebar

### Phase 2 (After Auth Service)
- [ ] Test login flow
- [ ] Verify menu expands after login
- [ ] Test logout flow
- [ ] Verify menu collapses after logout
- [ ] Test auth guard on protected routes
- [ ] Test redirect to login when accessing protected route
- [ ] Test return URL after successful login

---

## 🔒 Security Considerations

### Phase 1 (Current)
- ✅ No sensitive data exposed
- ✅ Public pages are truly public
- ✅ Hidden menu items don't mean protected routes (yet)

### Phase 2 (TODO)
- ⚠️ **Must implement route guards** - hiding menu items is not security
- ⚠️ **Never trust client-side auth** - always validate on backend
- ⚠️ **Secure token storage** - use httpOnly cookies or secure localStorage
- ⚠️ **HTTPS only** - never send credentials over HTTP
- ⚠️ **Input validation** - sanitize all user inputs
- ⚠️ **Rate limiting** - prevent brute force attacks

---

## 📝 Implementation Notes

### Why This Approach?

**Separation of Concerns**:
- Navigation only handles display logic
- Auth service handles authentication state
- Route guards handle access control

**Progressive Enhancement**:
- Phase 1: Structure & public items (no dependencies)
- Phase 2: Add auth service (no breaking changes)
- Phase 3: Add login UI (incremental)
- Phase 4: Add backend integration (when ready)

**Flexibility**:
- Easy to swap auth providers
- Can add more granular permissions later
- Works with any backend

---

## 🚀 Quick Start (After Pulling This Branch)

### To Test Current Implementation
```bash
# 1. Make sure you're on the feature branch
git checkout feature/auth-based-menu-visibility

# 2. Install dependencies (if needed)
npm install

# 3. Start the dev server
npm start
# or
nx serve jouster-ui

# 4. Open browser to http://localhost:4200
# 5. Verify only 3 menu items are visible
```

### To Continue Development
```bash
# 1. Create auth service
nx generate @nx/angular:service services/auth --project=jouster-ui

# 2. Create login component
nx generate @nx/angular:component components/login --project=jouster-ui

# 3. Create auth guard
nx generate @nx/angular:guard guards/auth --project=jouster-ui

# 4. Implement authentication logic (see Phase 2 tasks above)
```

---

## 📚 Resources

### Angular Authentication Guides
- [Angular.io - Security Guide](https://angular.io/guide/security)
- [Angular.io - Route Guards](https://angular.io/guide/router#preventing-unauthorized-access)
- [JWT Authentication in Angular](https://jwt.io/)

### Best Practices
- Store tokens securely
- Use HTTPS everywhere
- Implement refresh tokens
- Add CSRF protection
- Validate on server side

---

## 🎯 Success Criteria

### Phase 1 (Current) ✅
- [x] Public items always visible
- [x] Auth-required items hidden when not logged in
- [x] Clean code structure
- [x] No breaking changes
- [x] Documented approach

### Phase 2 (Future)
- [ ] Working login/logout flow
- [ ] Auth state persists across page refreshes
- [ ] Protected routes actually protected
- [ ] Smooth UX for login/logout
- [ ] Error handling for failed auth

---

**Next Action**: Decide on authentication approach (see "Authentication Options" above)

**Estimated Effort**: 
- Phase 2: 4-8 hours (depending on auth provider)
- Phase 3: 2-4 hours (login UI)
- Phase 4: Variable (depends on backend)

---

*Created: November 11, 2025*  
*Status: Phase 1 Complete - Ready for Auth Service Integration*

