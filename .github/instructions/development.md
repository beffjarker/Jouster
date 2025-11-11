# Development Guide for Jouster

> **Purpose:**
> This document provides detailed guidance for developers working on the Jouster project, including workflows, best practices, and technical procedures.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Nx Commands & Tools](#nx-commands--tools)
- [Dependency Management](#dependency-management)
- [Performance & Optimization](#performance--optimization)
- [Error Handling & Logging](#error-handling--logging)
- [CI/CD & Automation](#cicd--automation)
- [Platform-Specific Conventions](#platform-specific-conventions)
- [Internationalization & Accessibility](#internationalization--accessibility)
- [Common Pitfalls & Anti-Patterns](#common-pitfalls--anti-patterns)

---

## Getting Started

### Prerequisites

- Node.js v20.19.0 or >=22.12.0
- npm 10.5.0 or later
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/beffjarker/Jouster.git
cd Jouster

# Install dependencies
npm install

# Verify setup
nx run-many --target=lint --all
nx run-many --target=test --all
```

### Environment Configuration

1. Copy `.env.example` to `.env`
2. Configure required environment variables
3. Never commit `.env` file

---

## Development Workflow

### 1. Create a Branch

Follow branch naming conventions from CONTRIBUTING.md:

```bash
# Feature/bug branches
git checkout -b [initials]-[ticketnumber]-[description]
# Example: jb-US1234-add-user-login

# Operational branches
git checkout -b [initials]-OP-[description]
# Example: jb-OP-update-docs
```

### 2. Make Changes

- Follow coding standards (see CONTRIBUTING.md)
- Write tests alongside code
- Update documentation
- Use Nx generators when possible

### 3. Test Changes

```bash
# Run tests for changed code
nx affected --target=test

# Run specific project tests
nx test jouster-ui

# Run e2e tests
nx e2e jouster-ui-e2e
```

### 4. Commit Changes

Use Conventional Commits format:

```bash
git commit -m "feat(jouster-ui): add user login form"
git commit -m "fix(backend): resolve CORS issue"
git commit -m "docs(readme): update setup instructions"
```

### 5. Create Pull Request

- Push branch to GitHub
- Create PR against `develop` branch
- Fill out PR template
- Link related issues/tickets
- Request code review

---

## Nx Commands & Tools

### Common Commands

```bash
# Development servers
nx serve jouster-ui              # Start frontend
nx serve backend                 # Start backend
nx run-many --target=serve --all # Start all apps

# Building
nx build jouster-ui              # Build frontend
nx build backend                 # Build backend
nx affected --target=build       # Build affected projects

# Testing
nx test jouster-ui               # Test specific project
nx affected --target=test        # Test affected projects
nx e2e jouster-ui-e2e           # Run e2e tests

# Linting
nx lint jouster-ui               # Lint specific project
nx affected --target=lint        # Lint affected projects

# Code generation
nx generate @nx/angular:component my-component --project=jouster-ui
nx generate @nx/angular:service my-service --project=jouster-ui
nx generate @nx/angular:library my-lib

# Workspace analysis
nx graph                         # Interactive project graph
nx affected:graph               # Show affected projects
nx list                          # List installed plugins
nx show project jouster-ui      # Show project details

# Cache management
nx reset                         # Clear Nx cache
```

### Using Nx Generators

Always use Nx generators for consistency:

```bash
# Generate new library
nx generate @nx/angular:library my-lib --directory=libs/shared

# Generate component with tests
nx generate @nx/angular:component my-component --project=jouster-ui --export

# Generate service
nx generate @nx/angular:service my-service --project=jouster-ui

# Dry run (preview changes)
nx generate @nx/angular:component my-component --project=jouster-ui --dry-run
```

---

## Dependency Management

### Adding Dependencies

```bash
# Production dependency
npm install --save package-name

# Development dependency
npm install --save-dev package-name

# Specific version
npm install --save package-name@1.2.3
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all dependencies (careful!)
npm update

# Update specific package
npm install package-name@latest

# Security audit
npm audit
npm audit fix
```

### Best Practices

- **Prefer internal libs/** - Use shared code from `libs/` before adding external dependencies
- **Remove unused dependencies** - Run `npm prune` regularly
- **Security scanning** - Run `npm audit` before committing
- **Version pinning** - Use exact versions for critical dependencies
- **Regular updates** - Schedule quarterly dependency updates

---

## Performance & Optimization

### Frontend Optimization

- **Lazy loading** - Use lazy-loaded routes for code splitting
- **Change detection** - Use `OnPush` strategy where possible
- **Memoization** - Use `memo` or `useMemo` for expensive computations
- **Virtual scrolling** - Use for large lists
- **Image optimization** - Compress and use appropriate formats
- **Bundle analysis** - Use webpack-bundle-analyzer

### Backend Optimization

- **Database queries** - Use indexes, avoid N+1 queries
- **Caching** - Implement Redis or in-memory caching
- **Connection pooling** - Reuse database connections
- **Async operations** - Use async/await for I/O operations
- **Load balancing** - Distribute traffic across instances

### Monitoring

- **Performance metrics** - Track response times, memory usage
- **Error tracking** - Use error monitoring service
- **Logging** - Structured logging with appropriate levels
- **Profiling** - Use Node.js profiler for bottlenecks

---

## Error Handling & Logging

### Error Handling Patterns

```typescript
// Frontend - HTTP errors
this.http.get('/api/users').pipe(
  catchError(error => {
    this.logger.error('Failed to fetch users', error);
    return of([]);
  })
);

// Backend - Express error middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err, path: req.path });
  res.status(500).json({ message: 'Internal server error' });
});
```

### Logging Best Practices

- **Use shared logger** - Import from `libs/shared/logging`
- **Structured logging** - Include context: `logger.info('User logged in', { userId, timestamp })`
- **Log levels** - ERROR, WARN, INFO, DEBUG
- **Never log secrets** - Sanitize sensitive data
- **Never use console.log** - Use logger utility

### Log Levels

- **ERROR** - Application errors, exceptions
- **WARN** - Deprecated features, potential issues
- **INFO** - Application events, user actions
- **DEBUG** - Detailed diagnostic information (dev only)

---

## CI/CD & Automation

### GitHub Actions Workflows

Located in `.github/workflows/`:

- **ci.yml** - Run on all PRs (lint, test, build)
- **cd.yml** - Deploy on merge to main/develop
- **security.yml** - Dependency scanning, security checks

### Pre-commit Hooks

Configured in `.husky/`:

- **pre-commit** - Run linting on staged files
- **commit-msg** - Validate commit message format

### Running CI Locally

```bash
# Run all CI checks
nx run-many --target=lint --all
nx run-many --target=test --all
nx run-many --target=build --all

# Run only affected
nx affected --target=lint
nx affected --target=test
nx affected --target=build
```

### Status Checks

All PRs must pass:
- ✅ Linting (ESLint)
- ✅ Unit tests (Jest)
- ✅ E2E tests (Cypress)
- ✅ Build (no errors)
- ✅ Code review (at least 1 approval)

---

## Platform-Specific Conventions

### Frontend (Angular)

- **Component structure** - Smart/dumb component pattern
- **State management** - Use NgRx for complex state
- **Routing** - Lazy load feature modules
- **Forms** - Reactive forms for complex validation
- **Accessibility** - ARIA labels, keyboard navigation
- **i18n** - Use Angular i18n for translations

### Backend (Node.js)

- **API structure** - RESTful endpoints, consistent naming
- **Middleware** - Authentication, logging, error handling
- **Validation** - Use validation library (Joi, class-validator)
- **Database** - Use ORM/ODM (TypeORM, Mongoose)
- **Testing** - Unit tests with Jest, integration tests

### Infrastructure (Terraform)

- **Module structure** - Reusable modules in `infrastructure/modules/`
- **Environment separation** - `nonprod/` and `prod/` folders
- **State management** - Remote state in S3
- **Variables** - Use `.tfvars` files for configuration

---

## Internationalization & Accessibility

### Internationalization (i18n)

```typescript
// Use i18n library for all user-facing text
// Bad
<h1>Welcome</h1>

// Good
<h1 i18n="@@welcome">Welcome</h1>
```

- **Extract strings** - Use i18n extraction tools
- **Translation files** - Store in `assets/i18n/`
- **Date/time formatting** - Use locale-aware formatters
- **Number formatting** - Use locale-aware formatters

### Accessibility (a11y)

- **Semantic HTML** - Use proper HTML elements
- **ARIA labels** - Provide labels for screen readers
- **Keyboard navigation** - All features accessible via keyboard
- **Color contrast** - Meet WCAG AA standards
- **Focus management** - Visible focus indicators
- **Alt text** - Descriptive alt text for images

### Testing Accessibility

```bash
# Run accessibility linter
nx lint jouster-ui

# Manual testing
# - Test with screen reader (NVDA, JAWS)
# - Test keyboard-only navigation
# - Test with browser zoom (200%)
# - Use axe DevTools browser extension
```

---

## Common Pitfalls & Anti-Patterns

### TypeScript Anti-Patterns

```typescript
// ❌ Bad - Using 'any'
function process(data: any) { }

// ✅ Good - Proper typing
interface Data { id: string; name: string; }
function process(data: Data) { }

// ❌ Bad - Ignoring errors
try {
  riskyOperation();
} catch (e) { }

// ✅ Good - Handle errors
try {
  riskyOperation();
} catch (e) {
  logger.error('Operation failed', e);
  throw e;
}
```

### Angular Anti-Patterns

```typescript
// ❌ Bad - Direct DOM manipulation
document.getElementById('myElement').style.color = 'red';

// ✅ Good - Use Angular abstractions
@ViewChild('myElement') myElement: ElementRef;
this.renderer.setStyle(this.myElement.nativeElement, 'color', 'red');

// ❌ Bad - Subscribing without unsubscribe
this.service.getData().subscribe(data => this.data = data);

// ✅ Good - Use async pipe or unsubscribe
this.data$ = this.service.getData();
// Or in component
this.subscription = this.service.getData().subscribe(...);
ngOnDestroy() { this.subscription.unsubscribe(); }
```

### Code Duplication

```typescript
// ❌ Bad - Duplicating logic in apps
// apps/jouster-ui/src/utils/date.ts
// apps/backend/src/utils/date.ts

// ✅ Good - Shared utility in libs
// libs/shared/utils/src/lib/date.ts
// Import in both apps
```

---

## Summary

- Follow Nx conventions and use Nx tools
- Use shared code from `libs/`
- Write tests and documentation
- Use proper error handling and logging
- Optimize for performance
- Make code accessible and internationalized
- Avoid anti-patterns and code duplication
- Run CI checks locally before pushing

For more details, see:
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [ai-usage-guide.md](./ai-usage-guide.md) - AI assistance guide
- [nx.instructions.md](./nx.instructions.md) - Nx-specific guidance


