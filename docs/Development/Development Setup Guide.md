# Development Setup Guide

> **Complete guide for setting up the Jouster development environment**

## 📋 Development Documents

### Setup & Configuration
- [[WSL2-INSTALLATION]] - Windows Subsystem for Linux setup
- [[LINTING_BEST_PRACTICES]] - Code quality and linting standards

### Testing & Quality Assurance  
- [[SPECTATOR_TESTING_GUIDE]] - Angular testing with @ngneat/spectator
- [[CSS_FLEXBOX_GUIDE]] - Flexbox implementation guide
- [[FLEXBOX_IMPLEMENTATION_SUMMARY]] - Layout system summary
- [[Testing-Best-Practices]] - Jest and Angular testing best practices

## 🏗️ Technology Stack & Sources

### Core Development Stack
- **[Angular 20.3.0](https://angular.dev/)** - Primary framework
  - **Best Practice Source**: [Angular Style Guide](https://angular.dev/style-guide)
  - **Architecture Guide**: [Angular Architecture Overview](https://angular.dev/guide/architecture)
- **[TypeScript 5.9.2](https://www.typescriptlang.org/)** - Type-safe JavaScript
  - **Configuration Reference**: [TSConfig Reference](https://www.typescriptlang.org/tsconfig)
  - **Best Practices**: [TypeScript Best Practices](https://typescript-eslint.io/rules/)

### Build System & Tooling
- **[Nx 21.6.3](https://nx.dev/)** - Monorepo build system
  - **Configuration Guide**: [Nx Configuration](https://nx.dev/reference/project-configuration)
  - **Best Practices**: [Nx Best Practices](https://nx.dev/concepts/more-concepts/nx-and-angular)
- **[Vite](https://vitejs.dev/)** - Fast build tool (via Angular build)
  - **Documentation**: [Vite Guide](https://vitejs.dev/guide/)

### Testing Framework Stack
- **[Jest 29.7.0](https://jestjs.io/)** - JavaScript testing framework
  - **Configuration**: [Jest Configuration Options](https://jestjs.io/docs/configuration)
  - **Best Practices**: [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- **[@ngneat/spectator 21.0.1](https://github.com/ngneat/spectator)** - Angular testing utilities
  - **API Reference**: [Spectator API](https://github.com/ngneat/spectator#api)
  - **Testing Patterns**: [Angular Testing Patterns](https://angular.dev/guide/testing-components-scenarios)
- **[Cypress 14.2.1](https://www.cypress.io/)** - End-to-end testing
  - **Best Practices**: [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)

### Code Quality Tools
- **[ESLint 9.8.0](https://eslint.org/)** with **[Angular ESLint](https://github.com/angular-eslint/angular-eslint)**
  - **Configuration**: [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
  - **Angular Rules**: [Angular ESLint Rules](https://github.com/angular-eslint/angular-eslint#rules)
- **[Prettier 2.6.2](https://prettier.io/)** - Code formatting
  - **Configuration**: [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
  - **Integration**: [ESLint + Prettier Setup](https://prettier.io/docs/en/integrating-with-linters.html)

## 🚀 Quick Start

1. **Prerequisites**: Node.js 18+, Angular CLI, Java (for FFDec tools)
2. **Installation**: `npm install`
3. **Development**: `npm start` 
4. **Backend**: `cd backend && npm start`

## 🔗 Related Documentation

- [[System Architecture Overview]] - Technical architecture
- [[CSS Flexbox Guide]] - Layout implementation details
- [[Testing Documentation]] - Complete testing guide

---
*Development documentation maintained in [[03-Development-Guide]] folder*
