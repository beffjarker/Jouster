# Jouster

## 📖 Documentation

📐 **[Complete Documentation Vault](./vault/README.md)** - Organized documentation in Obsidian vault structure

### Quick Access
- **[Project Overview](./vault/01-Project-Overview/Project-Overview.md)** - Goals, setup, and getting started
- **[System Architecture](./vault/02-Architecture/System-Architecture-Overview.md)** - Technical architecture and design
- **[Development Guide](./vault/03-Development-Guide/Development-Setup-Guide.md)** - Setup, testing, and best practices
- **[Features](./vault/04-Features/Features-Overview.md)** - Flash experiments, music integration, Instagram
- **[API Integration](./vault/05-API-Integration/API-Integration-Overview.md)** - Last.fm, Instagram APIs, backend
- **Tools & Workflows** - Development tools and processes
- **AI & Automation** - Claude integration and workflows

## 🏗️ Technology Stack & Sources

### Core Framework
- **[Angular 20.3.0](https://angular.dev/)** - Modern TypeScript web framework
  - [Angular Documentation](https://angular.dev/overview)
  - [Angular Best Practices Guide](https://angular.dev/best-practices)
  - **Standalone Components** - [Angular Standalone Guide](https://angular.dev/guide/standalone-components)
  - **Signals** - [Angular Signals Documentation](https://angular.dev/guide/signals)

### Build System & Monorepo
- **[Nx 21.6.3](https://nx.dev/)** - Smart monorepos for modern development
  - [Nx Documentation](https://nx.dev/getting-started/intro)
  - [Nx Angular Plugin](https://nx.dev/nx-api/angular)
  - **Best Practice Source**: [Nx Best Practices](https://nx.dev/concepts/more-concepts/nx-and-angular)

### Language & Runtime
- **[TypeScript 5.9.2](https://www.typescriptlang.org/)** - Typed JavaScript at scale
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/)
  - **Strict Mode Configuration** - [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- **[Node.js 18+](https://nodejs.org/)** - JavaScript runtime
  - [Node.js Documentation](https://nodejs.org/en/docs/)

### UI & Styling
- **[CSS Flexible Box Layout (Flexbox)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)** - Primary layout system
  - **MDN Flexbox Guide**: [CSS Flexbox Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Basic_Concepts_of_Flexbox)
  - **W3C Specification**: [CSS Flexbox Level 1](https://www.w3.org/TR/css-flexbox-1/)
  - **Best Practice Source**: [A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- **[Sass/SCSS](https://sass-lang.com/)** - CSS preprocessing
  - [Sass Documentation](https://sass-lang.com/documentation/)

### Testing Framework
- **[Jest 29.7.0](https://jestjs.io/)** - JavaScript testing framework
  - [Jest Documentation](https://jestjs.io/docs/getting-started)
  - [Jest Configuration](https://jestjs.io/docs/configuration)
- **[@ngneat/spectator 21.0.1](https://github.com/ngneat/spectator)** - Angular testing utilities
  - [Spectator Documentation](https://github.com/ngneat/spectator)
- **[Cypress](https://www.cypress.io/)** - End-to-end testing framework
  - [Cypress Documentation](https://docs.cypress.io/)
  - **Best Practice Source**: [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
  - **Test Identifiers**: Using `data-cy` attributes for reliable element selection

### Backend & Database
- **[Express.js](https://expressjs.com/)** - Node.js web framework
  - [Express Documentation](https://expressjs.com/en/guide/routing.html)
- **[AWS DynamoDB](https://aws.amazon.com/dynamodb/)** - NoSQL database service
  - [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
  - **Local Development**: [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- **[AWS S3](https://aws.amazon.com/s3/)** - Object storage service
  - [S3 Documentation](https://docs.aws.amazon.com/s3/)

### Canvas & Animation
- **[HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** - 2D rendering context
  - [Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
  - **Animation**: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

## 🔧 Recent Updates & Fixes

### Flash Experiments Major Enhancement (October 2025)
- **Merged Fibonacci Patterns**: Successfully consolidated separate Fibonacci Spiral experiment into "Golden Ratio & Fibonacci Patterns"
  - Added 8 comprehensive Fibonacci/Golden Ratio presets from original Flash files
  - Includes: Classic Fibonacci spiral, Golden ratio, Nautilus shell, Galaxy spiral, Plant growth, Number sequence visualization
- **Organized Experiment Structure**: All experiments now properly categorized with comprehensive presets
  - **7 Major Categories**: Waves, Geometric, Particles, Interactive, Networks, Physics, Nature
  - **56+ Individual Presets**: Each experiment includes 8+ variations from original Flash files
- **Enhanced Canvas Animations**: Improved animation performance and visual quality
  - Proper cleanup and memory management for all animations
  - Smooth transitions between presets with real-time parameter updates
- **Complete Category System**: Advanced filtering and organization
  - Nature (Golden Ratio & Fibonacci Patterns)
  - Waves (Sine & Cosine Waves with 8 presets)
  - Geometric (Spiral Animation with 7 presets)
  - Particles (Particle System with 8 presets)
  - Interactive (Mouse Following with 8 presets)
  - Networks (Network Connections with 8 presets)
  - Physics (Bounce Physics with 8 presets)

### Email Component Restoration (October 2025)
- **Display Mode Implementation**: Changed "Actions" to "Display" for human-readable email parsing
- **Fixed API Connectivity**: Updated email service to use correct backend port (relative `/api` URLs)
- **Modernized HTTP Calls**: Replaced deprecated `toPromise()` with `firstValueFrom()` from RxJS
- **Enhanced Error Handling**: Improved error states and retry functionality
- **Comprehensive Testing**: Added Cypress e2e tests with `data-cy` test identifiers

### Conversation History Database Integration
- **DynamoDB Integration**: Set up proper database tables for conversation persistence
- **API Endpoints**: Created comprehensive REST API for conversation management
- **Migration System**: Built migration tool to convert JSON files to database records
- **Real-time Updates**: Conversations now automatically save to database
- **Analytics Dashboard**: Advanced conversation analytics and search functionality

### Full Stack Infrastructure Enhancement
- **IntelliJ IDEA Integration**: Complete run configurations for all services
  - Full Stack with Database configuration
  - Individual service configurations (Database, Backend, Frontend)
  - Proper startup sequence with dependency management
- **AWS Services Integration**: S3 bucket management and DynamoDB local development
- **Docker Containerization**: Database services running in Rancher Desktop
- **Environment Configuration**: Comprehensive .env file management for all services

## Architecture Documentation

Jouster follows modern Angular and web development best practices:

### Architectural Patterns
- **[Standalone Components](https://angular.dev/guide/standalone-components)** - No NgModules, direct imports, tree-shakable
- **[Dependency Injection](https://angular.dev/guide/di)** - Angular's built-in DI system
- **[Reactive Programming](https://rxjs.dev/guide/overview)** - RxJS observables for async operations
- **[Component-Service Architecture](https://angular.dev/guide/architecture-services)** - Separation of concerns

### Development Methodology
- **[Nx Monorepo](https://nx.dev/concepts/more-concepts/why-monorepos)** - Advanced build system and development tools
- **[Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)** - Branching strategy for releases
- **[Conventional Commits](https://www.conventionalcommits.org/)** - Commit message standards
- **[Semantic Versioning](https://semver.org/)** - Version numbering strategy

The complete architecture documentation is available in the **[vault/02-Architecture](./vault/02-Architecture/)** section.

## 🎨 UI Layout System

**Primary Layout Technology:** CSS Flexible Box Layout (Flexbox)

Jouster uses CSS Flexbox as the primary layout system throughout the entire application for:
- **Consistent Layouts** - Standardized patterns across all components
- **Responsive Design** - Mobile-first approach with inherent responsiveness  
- **Maintainable Code** - Predictable and easy-to-understand layout behavior
- **Modern Standards** - Industry best practices with excellent browser support

### Quick Start - Layout Classes

```html
<!-- Perfect centering -->
<div class="flex-center">Content</div>

<!-- Responsive card grid -->
<div class="flex flex-wrap gap-4">
  <div class="flex flex-col flex-1">Card 1</div>
  <div class="flex flex-col flex-1">Card 2</div>
</div>

<!-- Navigation layout -->
<nav class="flex justify-between items-center">
  <div>Logo</div>
  <ul class="flex gap-6">...</ul>
</nav>
```

### Documentation

- 📖 **[Complete Flexbox Guide](./vault/03-Development-Guide/CSS_FLEXBOX_GUIDE.md)** - Comprehensive implementation guide
- 🛠️ **Utility Classes** - `src/styles/flexbox-utilities.scss` - All available utility classes
- 🎯 **Global Patterns** - `src/styles.scss` - Base layout patterns and examples

### Implementation Status

- ✅ **Navigation Component** - Flexbox horizontal layout with responsive design
- ✅ **Home Page** - Flexbox column layout with utility classes
- ✅ **Listening History** - Flexbox card grids and responsive layouts
- ✅ **Flash Experiments** - Flexbox experiment grid with responsive cards
- ✅ **Conversation History** - Advanced Flexbox layouts with analytics dashboard
- ✅ **Global Utilities** - Comprehensive Flexbox utility class system

## 🛠️ Development Tools

**Tools Directory:** `tools/`

Jouster includes specialized development tools for Flash content analysis and modern web conversion:

### FFDec (Free Flash Decompiler) v19.1.0
- **Purpose:** Decompiling and analyzing Adobe Flash SWF files for Flash Experiments feature
- **Location:** `tools/ffdec/`
- **Platforms:** Windows (`.exe`), Cross-platform (`.jar`)
- **Usage:** Extract assets, scripts, and animations from legacy Flash content
- **Documentation:** See `tools/README.md` for complete usage guide

### Tool Management
- **Organization:** All tools centralized in `tools/` directory with proper versioning
- **Documentation:** Comprehensive usage guides and troubleshooting
- **Clean Structure:** Latest stable versions only, duplicates removed
- **Cross-Platform:** Support for Windows, macOS, and Linux development

**📖 [Complete Tools Documentation](./tools/README.md)**
