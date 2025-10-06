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

## 🛠️ Development Environment

### Prerequisites
- **Node.js**: 18+ with npm
  - **Installation Guide**: [Node.js Installation](https://nodejs.org/en/download/)
  - **Version Management**: [NVM Usage](https://github.com/nvm-sh/nvm)
- **Angular CLI**: Latest version
  - **Installation**: `npm install -g @angular/cli`
  - **Documentation**: [Angular CLI Reference](https://angular.dev/tools/cli)
- **Java**: Required for FFDec Flash decompiler
  - **Installation**: [OpenJDK Installation](https://openjdk.org/install/)
- **WSL2**: Recommended for containerized development
  - **Setup Guide**: [WSL2 Installation](https://docs.microsoft.com/en-us/windows/wsl/install)

### Quick Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Start backend API
cd backend && npm start

# Run tests
npm test

# Run linting
npm run lint
```

### IDE Configuration
- **Primary**: IntelliJ IDEA Ultimate
  - **Angular Plugin**: [Angular and AngularJS](https://plugins.jetbrains.com/plugin/6971-angular-and-angularjs)
  - **Configuration**: [IntelliJ Angular Setup](https://www.jetbrains.com/help/idea/angular.html)
- **Alternative**: VS Code with Angular extensions
  - **Extension Pack**: [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template)
- **Linting**: ESLint + Prettier integration
  - **VS Code**: [ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - **IntelliJ**: Built-in ESLint support

## 📚 Best Practice Sources

### Angular Best Practices
- **[Angular Style Guide](https://angular.dev/style-guide)** - Official Angular coding standards
- **[Angular Best Practices](https://angular.dev/best-practices)** - Performance and architecture guidance
- **[Angular Security Guide](https://angular.dev/guide/security)** - Security best practices

### TypeScript Best Practices
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - Complete TypeScript guide
- **[TypeScript ESLint Rules](https://typescript-eslint.io/rules/)** - Recommended TypeScript linting rules
- **[Effective TypeScript](https://effectivetypescript.com/)** - Advanced TypeScript patterns

### Testing Best Practices
- **[Angular Testing Guide](https://angular.dev/guide/testing)** - Official Angular testing documentation
- **[Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)** - Comprehensive testing guide
- **[Spectator Testing Patterns](https://github.com/ngneat/spectator#testing-components)** - Angular component testing patterns

## 🔗 Related Documentation

- [[Development-Tools]] - FFDec and other development tools
- [[System Architecture Overview]] - Technical architecture
- [[Project Overview]] - Getting started guide

---
*Development guides maintained in [[03-Development-Guide]] folder*
