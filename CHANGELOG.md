# Changelog

All notable changes to Jouster will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for Next Release
- jouster.org domain configuration with CloudFront
- Terraform infrastructure as code
- CI/CD pipeline with GitHub Actions
- Backend API deployment to AWS Lambda
- Production DynamoDB integration
- Enhanced testing coverage
- Performance monitoring and analytics

## [0.0.2] - 2025-10-28

### Copilot Instruction Enhancements 🤖

This release focuses on improving AI assistant behavior and workflow reliability.

### Added
- **Interactive Playground**: Main configurable experiment form at top of Flash Experiments page
  - Real-time parameter adjustment with sliders
  - 4 experiment types: Particles, Spiral, Waves, Sunflower
  - 15+ configurable parameters (gravity, friction, speed, rotation, etc.)
  - Large 600×450px canvas for experimentation
  - Start/Stop/Reset/Apply controls
- **Environment Detection Protocol**: Critical "detect environment first" principle
  - OS and shell verification before running commands
  - Windows-specific command syntax enforcement
  - Path separator handling (backslash vs forward slash)
- **Credential Management Guidelines**: Silent credential usage from .env files
  - Never ask user for credentials that exist in .env
  - Never expose credential values in responses
  - Automatic reading from git-ignored credential files
- **Output Redirection Mandate**: 100% command output to temp files
  - Workaround for JetBrains IntelliJ Copilot integration bug
  - Mandatory pattern: `command > temp-file.txt 2>&1`

### Changed
- **Flash Experiments Page Layout**: Restructured with featured experiment at top
  - Main interactive playground in purple gradient hero section
  - Historical experiments moved to library section below
  - Improved visual hierarchy and user engagement
- **Copilot Instructions**: Major updates to .github/copilot-instructions.md
  - Added "Environment Detection FIRST" as step 0
  - Added "Credential Management" security rules
  - Updated Quick Reference Checklist
- **Nx Instructions**: Enhanced .github/instructions/nx.instructions.md
  - Added Windows environment confirmation
  - Added 5-point checklist for environment-specific behavior
- **Verification Protocol**: Expanded .github/COPILOT-VERIFICATION-PROTOCOL.md
  - Added environment detection section
  - Added credential management section with examples
  - Comprehensive "do/don't" guidelines

### Documentation
- Created `docs/Project/COPILOT-INSTRUCTIONS-UPDATE-2025-10-28-ENVIRONMENT.md`
- Created `FLASH-EXPERIMENTS-FORM-IMPLEMENTATION.md`
- Created `FLASH-FORM-FINAL-STATUS.md`
- Updated dev-journal with session learnings

### Developer Experience
- **3 Critical Principles Now Enforced**:
  1. 🔍 DETECT: Verify environment before any command
  2. 📂 PIPE: Redirect all output to temp files, read, cleanup
  3. 🔐 PROTECT: Use credentials silently, never expose, never commit

### Technical Details
- Custom particle physics system with configurable gravity and friction
- Spiral animation with adjustable arms and rotation speed
- Wave visualization with amplitude and frequency controls
- Sunflower pattern with golden angle calculations
- All animations use requestAnimationFrame for 60fps performance

### Notes
- This release improves AI assistant reliability and security practices
- All new UI features are fully functional and production-ready
- Copilot will now provide Windows-appropriate commands automatically
- Credentials remain secure with silent usage pattern

## [0.0.1] - 2025-11-01

### Initial Release 🎉

This is the first official versioned release of Jouster - establishing a baseline for future development.

### Added
- **Flash Experiments**: 56+ interactive presets with canvas animations
- **Timeline Visualization**: Interactive maps using Leaflet integration
- **Conversation History**: Real-time chat and conversation tracking interface
- **Responsive Design**: Optimized for desktop and mobile devices
- **AWS Deployment**: Production deployment on S3 static website hosting
- **Environment Management**: Support for local, QA, staging, and production environments
- **Developer Tools**: Personal dev-journal and GitHub API integration tools
- **Security Features**: Helmet.js, rate limiting, CORS configuration
- **Docker Support**: DynamoDB Local in Docker containers for development
- **Nx Monorepo**: Modern monorepo architecture with Nx build system

### Infrastructure
- **Frontend**: Angular 20.3.3 SPA
- **Backend**: Node.js server with Express
- **Database**: DynamoDB Local (development), AWS DynamoDB ready (production)
- **Build Tool**: Nx 16.10.0
- **Node Version**: v20.12.1 (managed via .nvmrc)
- **Package Manager**: npm

### Deployment
- **Current**: AWS S3 static website hosting
- **Build Size**: 96.75 kB compressed (optimized production build)
- **Live URL**: http://jouster-org-static.s3-website-us-west-2.amazonaws.com

### Known Issues
- jouster.org domain not configured (DNS/CloudFront setup pending)
- Backend API not deployed to production (currently local only)
- Conversation history requires local backend/database setup
- No CI/CD pipeline configured yet

### Documentation
- Complete startup guide (STARTUP-GUIDE.md)
- Architecture documentation (docs/Architecture/)
- Security documentation (SECURITY.md)
- Deployment guide (docs/DEPLOYMENT.md)
- Developer journal system (dev-journal/)

### Development Experience
- Multiple startup modes (frontend only, full stack, backend only)
- Live reload for development
- Environment validation scripts
- Security audit tools
- Comprehensive error handling

### Notes
- This release establishes the baseline for future development
- Version control now managed via GitHub
- Production site is functional and accessible
- Full-stack features available in development mode

---

## Version History

- **0.0.1** - 2025-11-01 - Initial baseline release
- **0.0.0** - Pre-release development version

