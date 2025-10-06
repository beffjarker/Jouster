# Library and Best Practices References

> **Master Reference Document:** Comprehensive source references for all libraries, frameworks, and best practices used in the Jouster project.

---

## 🎯 Project Tech Stack Overview

### Frontend Framework
- **Angular 20.3.0**: [Official Documentation](https://angular.io/docs) | [GitHub](https://github.com/angular/angular)
- **TypeScript 5.9.2**: [Official Handbook](https://www.typescriptlang.org/docs/) | [GitHub](https://github.com/microsoft/TypeScript)
- **RxJS 7.8.0**: [Official Documentation](https://rxjs.dev/) | [GitHub](https://github.com/ReactiveX/rxjs)
- **Zone.js**: [GitHub Repository](https://github.com/angular/angular/tree/main/packages/zone.js)

### Development & Build Tools
- **Nx Workspace 21.6.3**: [Official Documentation](https://nx.dev/) | [GitHub](https://github.com/nrwl/nx)
- **Angular CLI 20.3.0**: [Official Documentation](https://angular.io/cli) | [GitHub](https://github.com/angular/angular-cli)
- **SWC Compiler**: [Official Documentation](https://swc.rs/) | [GitHub](https://github.com/swc-project/swc)

### Testing Framework
- **Jest 29.7.0**: [Official Documentation](https://jestjs.io/) | [GitHub](https://github.com/jestjs/jest)
- **@ngneat/spectator 21.0.1**: [Official Documentation](https://ngneat.github.io/spectator/) | [GitHub](https://github.com/ngneat/spectator)
- **Cypress 14.2.1**: [Official Documentation](https://docs.cypress.io/) | [GitHub](https://github.com/cypress-io/cypress)
- **jest-preset-angular**: [GitHub Repository](https://github.com/thymikee/jest-preset-angular)

### Code Quality & Linting
- **ESLint 9.8.0**: [Official Documentation](https://eslint.org/docs/latest/) | [GitHub](https://github.com/eslint/eslint)
- **Angular ESLint**: [Official Documentation](https://github.com/angular-eslint/angular-eslint) | [Rules Reference](https://github.com/angular-eslint/angular-eslint/tree/main/packages/eslint-plugin)
- **TypeScript ESLint**: [Official Documentation](https://typescript-eslint.io/) | [Rules Reference](https://typescript-eslint.io/rules/)
- **Prettier 2.6.2**: [Official Documentation](https://prettier.io/docs/en/) | [GitHub](https://github.com/prettier/prettier)

### UI & Styling
- **CSS Flexbox**: [W3C Specification](https://www.w3.org/TR/css-flexbox-1/) | [MDN Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
- **SCSS/Sass**: [Official Documentation](https://sass-lang.com/documentation/) | [GitHub](https://github.com/sass/sass)

### Mapping & Visualization
- **Leaflet 1.9.4**: [Official Documentation](https://leafletjs.com/) | [GitHub](https://github.com/Leaflet/Leaflet)
- **@types/leaflet**: [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/leaflet)

### Backend & Database
- **Node.js**: [Official Documentation](https://nodejs.org/en/docs/) | [GitHub](https://github.com/nodejs/node)
- **Express.js**: [Official Documentation](https://expressjs.com/) | [GitHub](https://github.com/expressjs/express)
- **DynamoDB**: [AWS Documentation](https://docs.aws.amazon.com/dynamodb/) | [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/)

### Music & Audio APIs
- **Last.fm API**: [Official Documentation](https://www.last.fm/api) | [Authentication Guide](https://www.last.fm/api/authentication)
- **Last.fm Web Authentication**: [Auth Specification](https://www.last.fm/api/authspec) | [Method Reference](https://www.last.fm/api/intro)

---

## 📚 Best Practices Sources

### Angular Best Practices
- **[Angular Style Guide](https://angular.io/guide/styleguide)** - Official Angular coding standards
- **[Angular Best Practices](https://angular.io/guide/best-practices)** - Performance and maintainability guidelines
- **[Angular Architecture Guide](https://angular.io/guide/architecture)** - Application architecture principles
- **[Angular Security Guide](https://angular.io/guide/security)** - Security best practices

### TypeScript Best Practices
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - Official TypeScript documentation
- **[TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)** - Comprehensive TypeScript guide
- **[TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)** - Official best practices
- **[TypeScript Performance](https://github.com/microsoft/TypeScript/wiki/Performance)** - Performance optimization guide

### Testing Best Practices
- **[Angular Testing Guide](https://angular.io/guide/testing)** - Official Angular testing documentation
- **[Jest Best Practices](https://jestjs.io/docs/jest-community)** - Community best practices
- **[Testing Angular Applications](https://github.com/lydemann/testing-angular-applications)** - Comprehensive testing guide
- **[Spectator vs TestBed](https://netbasal.com/testing-angular-components-with-spectator-8e9ebfadf6e9)** - Comparison and migration guide

### CSS & UI Best Practices
- **[CSS Guidelines](https://cssguidelin.es/)** - High-level advice and guidelines for writing sane CSS
- **[BEM Methodology](https://getbem.com/)** - CSS naming convention
- **[A11y Project](https://www.a11yproject.com/)** - Accessibility best practices
- **[Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)** - Accessibility standards

### Code Quality & Linting
- **[ESLint User Guide](https://eslint.org/docs/latest/use/)** - Configuration and best practices
- **[Prettier Options](https://prettier.io/docs/en/options.html)** - Code formatting configuration
- **[Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)** - Clean code principles for JavaScript/TypeScript

---

## 🏗️ Architecture & Design Patterns

### Angular Architecture Patterns
- **[Angular Architecture Patterns](https://angular.io/guide/architecture)** - Official architecture guide
- **[NgRx Pattern](https://ngrx.io/)** - State management patterns (not currently used but documented for future)
- **[Nx Workspace Architecture](https://nx.dev/concepts/more-concepts/applications-and-libraries)** - Monorepo architecture patterns

### Design Patterns
- **[Observer Pattern](https://refactoring.guru/design-patterns/observer)** - Used with RxJS observables
- **[Dependency Injection](https://angular.io/guide/dependency-injection)** - Angular's DI system
- **[Component Architecture](https://angular.io/guide/component-interaction)** - Component communication patterns

### CSS Architecture
- **[SMACSS](http://smacss.com/)** - Scalable and Modular Architecture for CSS
- **[ITCSS](https://itcss.io/)** - Inverted Triangle CSS architecture
- **[CSS Modules](https://github.com/css-modules/css-modules)** - Localized CSS

---

## 🔧 Development Tools & Environment

### IDE Configuration Sources
- **[Angular Language Service](https://angular.io/guide/language-service)** - Enhanced Angular development experience
- **[VS Code Angular Extensions](https://marketplace.visualstudio.com/search?term=angular&target=VSCode)** - Recommended extensions
- **[IntelliJ IDEA Angular Support](https://www.jetbrains.com/help/idea/angular.html)** - Angular development in IntelliJ

### Build & Development Tools
- **[Webpack Configuration](https://webpack.js.org/concepts/)** - Module bundling (via Angular CLI)
- **[Angular CLI Builders](https://angular.io/guide/cli-builder)** - Custom build processes
- **[Nx Generators](https://nx.dev/concepts/more-concepts/nx-devkit-generators)** - Code generation tools

### DevOps & Deployment
- **[Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)** - Container best practices
- **[Rancher Desktop](https://rancherdesktop.io/)** - Kubernetes and container management
- **[WSL2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)** - Windows Subsystem for Linux

---

## 🧪 Testing Strategy References

### Unit Testing
- **[Angular Component Testing](https://angular.io/guide/testing-components-basics)** - Component testing strategies
- **[Service Testing](https://angular.io/guide/testing-services)** - Service testing patterns
- **[HTTP Testing](https://angular.io/guide/http#testing-http-requests)** - HTTP client testing

### E2E Testing
- **[Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)** - End-to-end testing guidelines
- **[Angular E2E Testing](https://angular.io/guide/e2e-testing)** - Official E2E testing guide

### Test-Driven Development
- **[TDD with Angular](https://angular.io/guide/testing#test-driven-development)** - TDD methodology
- **[Red-Green-Refactor](https://www.codecademy.com/article/tdd-red-green-refactor)** - TDD cycle explanation

---

## 🔄 Continuous Integration & Quality

### Code Quality Gates
- **[SonarQube Angular](https://docs.sonarqube.org/latest/analysis/languages/typescript/)** - Code quality analysis
- **[Codecov](https://docs.codecov.com/docs)** - Code coverage reporting
- **[Dependency Check](https://owasp.org/www-project-dependency-check/)** - Security vulnerability scanning

### Performance Monitoring
- **[Angular Performance](https://angular.io/guide/performance)** - Performance optimization guide
- **[Web Vitals](https://web.dev/vitals/)** - Core web vitals and performance metrics
- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - Performance auditing

---

## 📖 Learning Resources

### Interactive Learning
- **[Angular Tutorial](https://angular.io/tutorial)** - Official Angular tutorial
- **[TypeScript Playground](https://www.typescriptlang.org/play)** - Online TypeScript editor
- **[Flexbox Froggy](https://flexboxfroggy.com/)** - Interactive CSS Flexbox game
- **[CSS Grid Garden](https://cssgridgarden.com/)** - Interactive CSS Grid game

### Video Courses & Tutorials
- **[Angular University](https://angular-university.io/)** - Comprehensive Angular courses
- **[Pluralsight Angular Path](https://www.pluralsight.com/paths/angular)** - Structured learning path
- **[Udemy Angular Courses](https://www.udemy.com/topic/angular/)** - Various Angular courses

### Books & Comprehensive Guides
- **[Angular Development with TypeScript](https://www.manning.com/books/angular-development-with-typescript-second-edition)** - Manning Publications
- **[You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)** - JavaScript fundamentals
- **[Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)** - Robert C. Martin

---

## 🔗 Related Documentation

### Internal Documentation
- [[SPECTATOR_TESTING_GUIDE]] - Detailed testing guide with @ngneat/spectator
- [[LINTING_BEST_PRACTICES]] - ESLint and code quality configuration
- [[CSS_FLEXBOX_GUIDE]] - CSS Flexbox implementation guide
- [[Development-Setup-Guide]] - Development environment setup
- [[WSL2-INSTALLATION]] - Windows development environment setup

### Project-Specific Guides
- [[FLASH_EXPERIMENTS_ARCHITECTURE]] - Flash experiments technical details
- [[INSTAGRAM_SETUP]] - API integration documentation
- [[Backend-API]] - Backend service documentation
- [[Conversation-History]] - Conversation history system

---

## 📝 Version Information

### Current Versions (as of documentation update)
- **Angular**: 20.3.0
- **TypeScript**: 5.9.2
- **Node.js**: Latest LTS
- **Nx**: 21.6.3
- **Jest**: 29.7.0
- **ESLint**: 9.8.0

### Upgrade Paths & Migration Guides
- **[Angular Update Guide](https://update.angular.io/)** - Interactive Angular upgrade guide
- **[TypeScript Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/)** - Version-specific changes
- **[Nx Migration Guide](https://nx.dev/recipes/adopting-nx/migration-walkthrough)** - Nx upgrade procedures

---

## 🤝 Contributing Guidelines

### Code Standards
All code contributions should follow the established patterns and reference the sources documented above:

1. **Angular Style Guide** compliance is mandatory
2. **ESLint rules** must pass without warnings
3. **Unit tests** required for all new components and services
4. **Accessibility standards** must be maintained
5. **TypeScript strict mode** compliance required

### Documentation Standards
- All new features must include appropriate source references
- Links to official documentation are preferred over blog posts
- Community resources should be well-established and maintained
- Update this master reference when adding new libraries or frameworks

---

*This document serves as the central hub for all technical references used in the Jouster project. Keep it updated when adding new libraries or changing best practices.*
