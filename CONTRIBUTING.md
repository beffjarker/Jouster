# Contributing to Jouster

Thank you for your interest in contributing to Jouster! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

---

## Getting Started

### Prerequisites

- **Node.js**: v20.12.1 (specified in `.nvmrc`)
- **npm**: 9.x or higher
- **Git**: Latest version
- **Docker**: For local database (optional for full-stack development)

### Setting Up Your Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Jouster.git
   cd Jouster
   ```

2. **Install Node Version**
   ```bash
   # Windows
   nvm use 20.12.1
   
   # Unix/Linux/Mac
   nvm use
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

5. **Start Development Server**
   ```bash
   # Frontend only
   npm start
   
   # Full stack (requires Docker)
   npm run start:full
   ```

6. **Verify Setup**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000 (if running full stack)
   - DynamoDB Admin: http://localhost:8001 (if running full stack)

---

## Development Workflow

### Branch Strategy

- `main` - Production-ready code, protected branch
- `develop` - Integration branch for features
- `feature/*` - Feature branches (e.g., `feature/timeline-improvements`)
- `bugfix/*` - Bug fix branches (e.g., `bugfix/experiment-loading`)
- `hotfix/*` - Critical production fixes

### Creating a Feature Branch

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

---

## Pull Request Process

### Before Submitting

1. **Update from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature-name
   git rebase develop
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Run Linter**
   ```bash
   npm run lint
   npm run lint:fix
   ```

4. **Verify Build**
   ```bash
   npm run build
   ```

5. **Run Security Audit**
   ```bash
   npm run security:audit
   ```

### Submitting Your PR

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to the Jouster repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template

3. **PR Title Format**
   ```
   feat: add new timeline filter
   fix: resolve experiment loading issue
   docs: update setup instructions
   chore: upgrade dependencies
   ```

4. **PR Description Should Include**
   - What changes were made and why
   - Related issue numbers (e.g., "Fixes #123")
   - Screenshots/GIFs for UI changes
   - Testing instructions
   - Breaking changes (if any)

### Review Process

- At least one maintainer review required
- All CI checks must pass
- Address review feedback promptly
- Keep PR scope focused and manageable

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow Angular style guide for Angular components
- Use ESLint configuration provided in the project
- Maintain 80% test coverage for new code

### Code Style

```typescript
// Good: Clear, typed, documented
/**
 * Loads experiment configuration by ID
 * @param experimentId - Unique identifier for the experiment
 * @returns Promise resolving to experiment configuration
 */
async function loadExperiment(experimentId: string): Promise<Experiment> {
  const config = await fetchExperimentConfig(experimentId);
  return parseExperiment(config);
}

// Bad: Unclear, no types, no documentation
function load(id) {
  return fetch('/api/' + id).then(r => r.json());
}
```

### File Organization

```
feature-name/
├── feature-name.component.ts       # Component logic
├── feature-name.component.html     # Template
├── feature-name.component.scss     # Styles
├── feature-name.component.spec.ts  # Tests
├── feature-name.service.ts         # Service (if needed)
├── feature-name.model.ts           # Types/interfaces
└── index.ts                        # Public API
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ExperimentListComponent`)
- **Services**: PascalCase + Service (e.g., `ExperimentService`)
- **Interfaces**: PascalCase (e.g., `Experiment`, `TimelineConfig`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_EXPERIMENTS`)
- **Functions**: camelCase (e.g., `loadExperiment`)
- **Files**: kebab-case (e.g., `experiment-list.component.ts`)

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring (no behavior change)
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates
- `ci` - CI/CD configuration changes
- `build` - Build system changes

### Examples

```bash
# Feature
feat(experiments): add filter by category

# Bug fix
fix(timeline): resolve map marker positioning

# Documentation
docs(readme): update installation instructions

# Chore
chore(deps): upgrade Angular to 20.3.3

# Breaking change
feat(api)!: change experiment data structure

BREAKING CHANGE: Experiment interface now requires `categoryId` field
```

### Scope

Optional, indicates what part of the codebase is affected:
- `experiments` - Flash experiments feature
- `timeline` - Timeline visualization
- `conversation` - Conversation history
- `api` - Backend API
- `ui` - General UI components
- `docs` - Documentation
- `deps` - Dependencies

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

**Unit Tests:**
```typescript
describe('ExperimentService', () => {
  let service: ExperimentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExperimentService]
    });
    service = TestBed.inject(ExperimentService);
  });

  it('should load experiment by id', async () => {
    const experiment = await service.loadExperiment('test-id');
    expect(experiment).toBeDefined();
    expect(experiment.id).toBe('test-id');
  });
});
```

**E2E Tests:**
```typescript
describe('Experiments Page', () => {
  it('should display list of experiments', () => {
    cy.visit('/experiments');
    cy.get('.experiment-card').should('have.length.greaterThan', 0);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys

---

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Include examples for non-obvious usage
- Keep comments up-to-date with code changes

### Project Documentation

When adding features, update:
- README.md - If user-facing changes
- docs/ - Detailed documentation
- CHANGELOG.md - Note changes for next release
- API documentation - If backend changes

### Documentation Style

```typescript
/**
 * Loads and parses experiment configuration from API
 * 
 * @param experimentId - Unique identifier for the experiment
 * @param options - Optional loading configuration
 * @param options.includeMetadata - Whether to include experiment metadata
 * @param options.cache - Whether to use cached data
 * @returns Promise resolving to parsed experiment object
 * @throws {ExperimentNotFoundError} If experiment doesn't exist
 * @throws {APIError} If API request fails
 * 
 * @example
 * ```typescript
 * const experiment = await loadExperiment('exp-123', {
 *   includeMetadata: true,
 *   cache: false
 * });
 * ```
 */
async function loadExperiment(
  experimentId: string,
  options?: LoadOptions
): Promise<Experiment> {
  // Implementation...
}
```

---

## Environment & Security

### Environment Variables

- Never commit `.env` files
- Use `.env.example` as template
- Document all environment variables
- Keep secrets in git-ignored files

### Security Best Practices

- Run `npm run security:audit` before submitting PR
- Fix critical and high vulnerabilities
- Never hardcode secrets in code
- Use environment variables for sensitive data
- Follow OWASP security guidelines

---

## Getting Help

### Resources

- **Documentation**: [docs/](./docs/)
- **Startup Guide**: [STARTUP-GUIDE.md](./STARTUP-GUIDE.md)
- **Architecture**: [docs/Architecture/](./docs/Architecture/)
- **Security**: [SECURITY.md](./SECURITY.md)

### Communication

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Pull Requests**: Code review and feedback

---

## Recognition

Contributors will be recognized in:
- CHANGELOG.md release notes
- GitHub contributors page
- Project documentation

---

## License

By contributing to Jouster, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Jouster!** 🎉

