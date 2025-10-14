# Jouster Application Architecture

## Overview
Jouster is a modern Angular 20+ application built with Nx monorepo tooling, implementing a standalone component architecture with modern best practices.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Angular 20+ SPA]
        B[Standalone Components]
        C[Routing System]
    end
    
    subgraph "Development Tools"
        D[Nx Workspace]
        E[ESLint + Prettier]
        F[Jest Testing]
        G[Cypress E2E]
    end
    
    subgraph "Build & Deploy"
        H[Angular CLI]
        I[TypeScript 5.9]
        J[Webpack/esbuild]
    end
    
    A --> B
    A --> C
    D --> A
    E --> A
    F --> A
    G --> A
    H --> J
    I --> J
```

## Application Structure

```
Jouster/
├── src/
│   ├── app/
│   │   ├── app.ts              # Root standalone component
│   │   ├── app.config.ts       # Application configuration
│   │   ├── app.routes.ts       # Route definitions
│   │   ├── app.html            # Root template
│   │   ├── app.scss            # Root styles
│   │   └── nx-welcome.ts       # Welcome component
│   ├── main.ts                 # Bootstrap entry point
│   ├── index.html              # HTML shell
│   └── styles.scss             # Global styles
├── nx.json                     # Nx workspace config
├── project.json                # Project configuration
├── tsconfig.json               # TypeScript config
├── eslint.config.mjs           # ESLint configuration
└── package.json                # Dependencies & scripts
```

## Component Architecture

```mermaid
graph TD
    subgraph "Application Bootstrap"
        A[main.ts] --> B[App Component]
    end
    
    subgraph "Root Component"
        B --> C[app.config.ts]
        B --> D[app.routes.ts]
        B --> E[Router Outlet]
    end
    
    subgraph "Feature Components"
        E --> F[NxWelcome Component]
        E --> G[Future Game Components]
        E --> H[Future Tournament Components]
    end
    
    subgraph "Shared Services"
        I[Game Service]
        J[Player Service]
        K[Tournament Service]
    end
    
    G --> I
    H --> J
    H --> K
```

## Modern Angular Features Used

```mermaid
mindmap
  root((Angular 20+))
    Standalone Components
      No NgModules
      Direct imports
      Tree-shakable
    Application Config
      Provider functions
      Functional guards
      Interceptors
    Modern Router
      Lazy loading
      Route guards
      Data resolvers
    TypeScript 5.9
      Strict mode
      Latest features
      Strong typing
```

## Development Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Nx as Nx CLI
    participant ESLint as ESLint
    participant Jest as Jest
    participant Cypress as Cypress
    participant Build as Build System
    
    Dev->>Nx: nx serve
    Nx->>ESLint: Lint code
    ESLint-->>Nx: ✅ Clean
    Nx->>Build: Start dev server
    Build-->>Dev: http://localhost:4200
    
    Dev->>Nx: nx test
    Nx->>Jest: Run unit tests
    Jest-->>Nx: Test results
    
    Dev->>Nx: nx e2e
    Nx->>Cypress: Run E2E tests
    Cypress-->>Nx: E2E results
    
    Dev->>Nx: nx build
    Nx->>Build: Production build
    Build-->>Dev: Optimized bundle
```

## Configuration Architecture

```mermaid
graph LR
    subgraph "TypeScript Config"
        A[tsconfig.json] --> B[tsconfig.app.json]
        A --> C[tsconfig.spec.json]
    end
    
    subgraph "Build Config"
        D[project.json] --> E[Build Targets]
        D --> F[Serve Targets]
        D --> G[Test Targets]
    end
    
    subgraph "Code Quality"
        H[eslint.config.mjs] --> I[Angular Rules]
        H --> J[TypeScript Rules]
        K[prettier.json] --> L[Code Formatting]
    end
    
    subgraph "Testing Config"
        M[jest.config.ts] --> N[Unit Tests]
        O[cypress.config.ts] --> P[E2E Tests]
    end
```

## Dependency Architecture

```mermaid
graph TB
    subgraph "Runtime Dependencies"
        A[@angular/core 20.3.0]
        B[@angular/common]
        C[@angular/router]
        D[rxjs 7.8.0]
        E[zone.js 0.15.0]
    end
    
    subgraph "Development Tools"
        F[@nx/* 21.6.2]
        G[TypeScript 5.9.2]
        H[ESLint 9.8.0]
        I[Jest 29.7.0]
        J[Cypress 14.2.1]
    end
    
    subgraph "Build Tools"
        K[@angular/cli 20.3.0]
        L[@angular/build]
        M[@swc/core 1.5.7]
    end
    
    A --> D
    A --> E
    F --> G
    F --> H
    K --> L
    L --> M
```

## Future Architecture Extensions

```mermaid
graph TD
    subgraph "Current State"
        A[Basic Angular App]
        B[Nx Workspace]
        C[Modern Config]
    end
    
    subgraph "Game Features"
        D[Game Engine]
        E[Player Management]
        F[Tournament System]
        G[AI Opponents]
    end
    
    subgraph "Advanced Features"
        H[Real-time Multiplayer]
        I[State Management]
        J[Progressive Web App]
        K[Performance Monitoring]
    end
    
    A --> D
    A --> E
    B --> F
    C --> G
    
    D --> H
    E --> I
    F --> J
    G --> K
```

## Performance Considerations

```mermaid
graph LR
    subgraph "Bundle Optimization"
        A[Tree Shaking] --> B[Code Splitting]
        B --> C[Lazy Loading]
    end
    
    subgraph "Runtime Performance"
        D[OnPush Strategy] --> E[Async Pipe]
        E --> F[TrackBy Functions]
    end
    
    subgraph "Build Performance"
        G[SWC Compiler] --> H[esbuild]
        H --> I[Parallel Processing]
    end
    
    subgraph "Developer Experience"
        J[HMR] --> K[Fast Refresh]
        K --> L[Source Maps]
    end
```

## Security Architecture

```mermaid
graph TB
    subgraph "Input Validation"
        A[Angular Forms] --> B[Validators]
        B --> C[Sanitization]
    end
    
    subgraph "Build Security"
        D[TypeScript] --> E[Strict Mode]
        E --> F[Type Safety]
    end
    
    subgraph "Runtime Security"
        G[CSP Headers] --> H[HTTPS Only]
        H --> I[Secure Dependencies]
    end
    
    A --> D
    D --> G
```

## Key Architectural Decisions

1. **Standalone Components**: Eliminates NgModules for better tree-shaking and simpler architecture
2. **Nx Monorepo**: Provides scalable development tools and build optimization
3. **Modern TypeScript**: Leverages latest language features for better developer experience
4. **Functional Configuration**: Uses provider functions instead of classes for better performance
5. **ESLint Flat Config**: Modern linting configuration for better maintainability

## Best Practices Implemented

- ✅ Standalone component architecture
- ✅ Modern Angular 20+ features
- ✅ TypeScript strict mode
- ✅ Comprehensive linting rules
- ✅ Unit and E2E testing setup
- ✅ Modern build tools (SWC, esbuild)
- ✅ Code formatting with Prettier
- ✅ Git hooks and commit linting
- ✅ Performance optimizations

---

*Generated on: October 3, 2025*
*Angular Version: 20.3.0*
*Nx Version: 21.6.2*
