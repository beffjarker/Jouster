# Tools and Workflows

> **Development tools, build processes, and automation workflows with comprehensive source documentation**

## 🛠️ Development Tools & Sources

### FFDec (Flash Decompiler)
- **[FFDec Official Repository](https://github.com/jindrapetrik/jpexs-decompiler)** - Open source Flash decompiler
- **[FFDec Documentation](https://github.com/jindrapetrik/jpexs-decompiler/wiki)** - Official documentation and guides
- **[GPL v3+ License](https://www.gnu.org/licenses/gpl-3.0.html)** - Open source license
- [[Development-Tools]] - Complete FFDec documentation
- **Version**: v19.1.0 (latest stable)
- **Location**: `tools/ffdec/`
- **Purpose**: Flash SWF analysis and asset extraction
- **Platforms**: Windows (.exe), Cross-platform (.jar)

**Implementation References**:
- **Java Runtime**: [OpenJDK Installation Guide](https://openjdk.org/install/)
- **Command Line Usage**: [FFDec CLI Documentation](https://github.com/jindrapetrik/jpexs-decompiler/wiki/Command-line)
- **Asset Extraction**: [SWF File Format Specification](https://www.adobe.com/content/dam/acom/en/devnet/pdf/swf-file-format-spec.pdf)

### Build Tools & Automation
- **[Nx 21.6.3](https://nx.dev/)** - Smart monorepo build system
  - **CLI Reference**: [Nx CLI Commands](https://nx.dev/nx-api/nx)
  - **Configuration**: [Nx Configuration Reference](https://nx.dev/reference/project-configuration)
  - **Plugins**: [Nx Angular Plugin](https://nx.dev/nx-api/angular)
- **[Angular CLI](https://angular.dev/tools/cli)** - Component generation and builds
  - **Schematics**: [Angular Schematics](https://angular.dev/tools/cli/schematics)
  - **Build Configuration**: [Angular Build Options](https://angular.dev/tools/cli/build)
- **[npm Scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)** - Task automation
  - **Best Practices**: [npm Scripts Best Practices](https://docs.npmjs.com/misc/scripts)

### Code Quality Tools
- **[ESLint 9.8.0](https://eslint.org/)** with **[Prettier 2.6.2](https://prettier.io/)**
  - **Configuration**: [ESLint Configuration Guide](https://eslint.org/docs/latest/use/configure/)
  - **Angular Rules**: [Angular ESLint Rules](https://github.com/angular-eslint/angular-eslint#rules)
  - **Integration**: [ESLint + Prettier Setup](https://prettier.io/docs/en/integrating-with-linters.html)
- **[TypeScript ESLint](https://typescript-eslint.io/)** - TypeScript-specific linting
  - **Rules Reference**: [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
  - **Configuration**: [TypeScript ESLint Configuration](https://typescript-eslint.io/getting-started)

### Testing Framework Stack
- **[Jest 29.7.0](https://jestjs.io/)** - JavaScript testing framework
  - **Configuration**: [Jest Configuration Options](https://jestjs.io/docs/configuration)
  - **Best Practices**: [Jest Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- **[@ngneat/spectator 21.0.1](https://github.com/ngneat/spectator)** - Angular testing utilities
  - **API Reference**: [Spectator Testing API](https://github.com/ngneat/spectator#api)
  - **Patterns**: [Angular Component Testing](https://angular.dev/guide/testing-components-scenarios)
- **[Cypress 14.2.1](https://www.cypress.io/)** - End-to-end testing
  - **Best Practices**: [Cypress Testing Best Practices](https://docs.cypress.io/guides/references/best-practices)
  - **Configuration**: [Cypress Configuration](https://docs.cypress.io/guides/references/configuration)

## 📋 Automated Workflows & Sources

### Code Quality Automation
Following **[Continuous Integration Best Practices](https://martinfowler.com/articles/continuousIntegration.html)**:

#### Pre-commit Hooks
- **[Husky](https://typicode.github.io/husky/)** - Git hooks management
- **[lint-staged](https://github.com/okonet/lint-staged)** - Run linters on staged files
- **Configuration Source**: [Git Hooks Best Practices](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

#### Automated Testing
```bash
# Test pipeline based on: https://jestjs.io/docs/cli
npm test                    # Unit tests with Jest
npm run test:coverage       # Coverage reports
npm run test:watch          # Watch mode for development
npm run e2e                 # End-to-end tests with Cypress
```

#### Linting Pipeline
```bash
# Linting workflow based on: https://eslint.org/docs/latest/use/command-line-interface
npm run lint               # Check all files
npm run lint:fix           # Auto-fix issues
npm run prettier:check     # Format checking
npm run prettier:write     # Auto-format files
```

### Build Automation
Following **[Nx Build System Best Practices](https://nx.dev/concepts/more-concepts/nx-and-angular)**:

#### Development Workflow
```bash
# Development commands based on Nx documentation
npm start                  # Development server
npm run serve              # Alternative serve command
npm run build              # Production build
npm run build:dev          # Development build
```

#### Multi-Service Orchestration
```bash
# Service orchestration based on: https://docs.docker.com/compose/
npm run start:full         # Complete stack startup
npm run db:start           # Database services
npm run backend:start      # Backend API server
npm run frontend:start     # Frontend development server
```

### Flash Content Processing Workflow
Based on **[Adobe SWF File Format](https://www.adobe.com/content/dam/acom/en/devnet/pdf/swf-file-format-spec.pdf)**:

1. **Analysis Phase**
   ```bash
   # Using FFDec for SWF analysis
   cd tools/ffdec
   java -jar ffdec.jar -export all output_folder input.swf
   ```

2. **Asset Extraction**
   - **Scripts**: ActionScript decompilation for logic analysis
   - **Images**: PNG/JPEG extraction for visual assets
   - **Animations**: Timeline and tween analysis
   - **Sounds**: Audio asset extraction

3. **Modern Implementation**
   - **Canvas API**: [HTML5 Canvas Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
   - **WebGL**: [WebGL Fundamentals](https://webglfundamentals.org/)
   - **Animation**: [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

## 🔧 IDE Configuration & Sources

### IntelliJ IDEA Ultimate (Primary)
- **[IntelliJ Angular Plugin](https://plugins.jetbrains.com/plugin/6971-angular-and-angularjs)** - Angular development support
- **[TypeScript Support](https://www.jetbrains.com/help/idea/typescript-support.html)** - Built-in TypeScript integration
- **[ESLint Integration](https://www.jetbrains.com/help/idea/eslint.html)** - Code quality integration
- **Configuration**: [IntelliJ Angular Development](https://www.jetbrains.com/help/idea/angular.html)

### VS Code (Alternative)
- **[Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template)** - Angular template support
- **[ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)** - Linting integration
- **[Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)** - Code formatting
- **Configuration**: [VS Code Angular Setup](https://code.visualstudio.com/docs/nodejs/angular-tutorial)

### Development Environment Stack
- **[Node.js 18+](https://nodejs.org/)** - JavaScript runtime
  - **Version Management**: [NVM Usage Guide](https://github.com/nvm-sh/nvm)
  - **Package Management**: [npm Documentation](https://docs.npmjs.com/)
- **[WSL2](https://docs.microsoft.com/en-us/windows/wsl/)** - Windows Subsystem for Linux
  - **Setup Guide**: [[WSL2-INSTALLATION]] - Internal setup documentation
  - **Docker Integration**: [Docker Desktop WSL2](https://docs.docker.com/desktop/wsl/)
- **[Rancher Desktop](https://rancherdesktop.io/)** - Container management
  - **Documentation**: [Rancher Desktop Docs](https://docs.rancherdesktop.io/)
  - **Kubernetes**: [K3s Documentation](https://rancher.com/docs/k3s/latest/en/)

## 📚 Best Practice Sources & References

### Development Workflows
- **[Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)** - Branching strategy
- **[Conventional Commits](https://www.conventionalcommits.org/)** - Commit message standards
- **[Semantic Versioning](https://semver.org/)** - Version numbering strategy
- **[Code Review Best Practices](https://github.com/google/eng-practices/blob/master/review/reviewer/index.md)** - Google's code review guide

### Quality Assurance
- **[Testing Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)** - Testing strategy
- **[Angular Testing Guide](https://angular.dev/guide/testing)** - Framework-specific testing
- **[TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)** - Test-driven development

### Performance & Security
- **[Web Performance Best Practices](https://developers.google.com/web/fundamentals/performance)** - Google Web Fundamentals
- **[OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)** - Security best practices
- **[Angular Security Guide](https://angular.dev/guide/security)** - Framework security

## 🔗 Related Documentation & Sources

### Internal Documentation
- [[LINTING_BEST_PRACTICES]] - Code quality standards
- [[Development Setup Guide]] - Environment configuration  
- [[Features Overview]] - Tool usage in feature development
- [[Testing-Best-Practices]] - Testing implementation guide

### External References
- **[Nx Best Practices](https://nx.dev/concepts/more-concepts/nx-and-angular)** - Monorepo management
- **[Angular Style Guide](https://angular.dev/style-guide)** - Official coding standards
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - Language documentation
- **[MDN Web Docs](https://developer.mozilla.org/)** - Web standards reference

### Community Resources
- **[Angular Community](https://angular.dev/community)** - Official community resources
- **[Nx Community](https://nx.dev/community)** - Nx ecosystem and plugins
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/angular)** - Community Q&A

---
*Tools and workflows maintained in [[06-Tools-and-Workflows]] folder*
