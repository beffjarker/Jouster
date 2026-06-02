# Changelog

All notable changes to Jouster will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-06-02

### 🎯 Life Map Filters, Angular 21 Upgrade & Infrastructure Improvements

Major feature release adding interactive Life Map filtering, upgrading the framework to Angular 21 + Nx 22, reorganizing documentation, and hardening deployment infrastructure.

### Added
- **Life Map Filters** 🗺️
  - City, tag, year range, and approximate date filters on the Timeline page
  - Clear filters button with active filter detection
  - Literary-themed category colors for timeline entries
  - Current date/time display in Life Map header

- **New Shared UI Components** 🧩
  - `SearchableSelectComponent` — searchable dropdown for filtering
  - `TimelineSliderComponent` — interactive year-range slider
  - `PageTitleComponent` + `PAGE_REGISTRY` for unified page titles
  - Navigation now derives items from the page registry

- **Environment Configuration** ⚙️
  - `AppEnvironment` interface for typed environment configs
  - QA, Staging, and Production environment files with full config
  - Dynamic proxy (`proxy.conf.mjs`) with `PROXY_TARGET` support
  - Version display in navigation component

- **Authentication Infrastructure** 🔐
  - Hidden login component with auth guard
  - Credentials interceptor for backend communication
  - Auth MFE app fully restored (23 files from stash recovery)
  - Backend auth routes and middleware

- **Backend Services** 🖥️
  - Life Map API routes and seed scripts
  - DynamoDB service for data persistence
  - Placeholder SVG assets for content types

- **CI/CD Improvements** 🚀
  - Branch cleanup workflow (automated stale branch deletion)
  - Scheduled cleanup workflow for orphaned resources
  - PR preview comment improvements (commit SHA, timestamp, deployment button)
  - GitHub Deployment Environment API integration

- **Documentation** 📚
  - Major docs reorganization into AWS/, CICD/, Development/, Features/, Project/, Security/
  - Blue/Green deployment analysis document
  - Angular 21 upgrade plan
  - HTTP redirect troubleshooting guide
  - 50+ obsolete session/status docs removed

- **Security** 🔒
  - `.env.production` untracked from git
  - Environment templates added (`.env.production.template`, `.env.qa.example`, `.env.staging.example`)
  - Hardened `.gitignore` with explicit exceptions

### Changed
- **Framework Upgrade**: Nx 16 → 22.6.5, Angular 19 → 21.2.9 (#33)
- **Shared UI**: Removed broken ng-packagr-lite build target (lib consumed from source via tsconfig paths)
- **Style Budgets**: Increased anyComponentStyle to 20kb warn / 40kb error (Leaflet CSS)
- **Deploy Scripts**: Corrected build output paths, regions (us-east-1 → us-west-2), build configurations
- **Flash Experiments**: Major component rewrite with enhanced canvas animations
- **Navigation**: Derives from PAGE_REGISTRY, shows version in footer
- **Leaflet Map**: Fixed initialization timing (retry on DOM not ready), ViewEncapsulation.None for CSS compatibility, local CSS/image assets

### Fixed
- **Leaflet Map**: NaN in date range stat (use Math.min/Max over valid years)
- **Auth MFE**: Restored 23 zeroed-out files from git stash (March 2026 sync issue)
- **Jouster UI**: Restored 6 empty files from stash (auth interceptor, login, services)
- **CI Build**: Removed incompatible outputPath from shared-ui project.json
- **Deploy Scripts**: Correct paths (`dist/apps/jouster-ui/browser/`), correct region, correct build config

### Security
- Fixed all Dependabot security alerts (#37)
- Dependency updates: koa, @nx/angular, validator, express-validator
- Untracked production secrets from version control

### Infrastructure
- **Docker Compose**: Local development environment setup
- **Root Cleanup**: Moved batch scripts to `scripts/`, deleted obsolete files
- **Package Lock**: Synced after Nx 22 upgrade, removed `.bak` file

---

## [0.5.1] - 2025-11-13

### Fixed
- Production deployment to us-west-2
- Package-lock.json sync after Nx 22 upgrade
- Version logging to browser console

---

## [0.5.0] - 2025-11-11

### 🎯 Pre-Release: HTTPS Infrastructure & Auth-Based Navigation

This release brings professional HTTPS infrastructure and authentication-ready navigation. **This is a pre-production release** - full production (1.0.0) will follow after proper staging verification.

**Note**: Version 1.0.0 was prematurely released without proper staging verification. This has been reverted to 0.5.0 to follow the correct release process with human testing at each stage.

### Added
- **HTTPS Infrastructure** 🔒
  - CloudFront CDN distribution (E3EQJ0O0PJTVVX) with global content delivery
  - Free SSL certificate (ACM) with automatic renewal
  - Custom domain: https://jouster.org
  - Automatic HTTP → HTTPS redirect for all traffic
  - TLS 1.2+ enforcement for security

- **Auth-Based Navigation** 🎨
  - Smart menu filtering based on authentication status
  - Public items always visible: Flash Experiments, About, Contact
  - Auth-required items hidden until login: Highlights, Timeline, Conversations, Fibonacci, Music, Emails
  - Infrastructure ready for authentication service integration

- **Deployment Infrastructure** 🚀
  - QA Environment: http://qa.jouster.org for testing
  - Preview Environments: Automated preview deployment for every PR
  - Staging Environment: Ready for pre-production testing
  - Automated GitHub Actions workflows for CI/CD
  - S3-based static hosting with CloudFront distribution

- **Documentation** 📚
  - Complete SSL/HTTPS setup guides
  - Authentication implementation roadmap (`docs/AUTH-MENU-TODO.md`)
  - Deployment workflows and troubleshooting
  - Comprehensive session summaries
  - Workflow cleanup documentation

### Changed
- **Navigation**: Menu items dynamically filtered - only 3 public items visible when not authenticated
- **Region Migration**: Infrastructure migrated to us-west-2 for optimized performance
  - S3 buckets and resources in us-west-2
  - ACM certificate remains in us-east-1 (CloudFront requirement)
- **Repository Cleanup**: Removed 61 non-Jouster GitHub workflows (81% reduction, 75 → 14 workflows)

### Fixed
- **Preview Environments**: Removed CSP `upgrade-insecure-requests` header that prevented HTTP preview environments from loading
- **QA Deployment**: Fixed Route53 hosted zone ID extraction to handle multiple zones correctly
- **Build Process**: Resolved environment file permission and caching issues

### Infrastructure
- **CloudFront Distribution**: E3EQJ0O0PJTVVX
- **SSL Certificate**: Auto-renewing ACM certificate (valid until Nov 2026)
- **Custom Domain**: https://jouster.org
- **QA Environment**: http://qa.jouster.org
- **Staging Environment**: Ready for deployment
- **Preview Pattern**: http://jouster-preview-pr{number}.s3-website-us-west-2.amazonaws.com

### Security
- TLS 1.2+ minimum encryption
- HTTPS-only access in production
- Public S3 bucket policies restricted to website hosting
- No credentials or secrets committed
- Content Security Policy headers ready for deployment

### Performance
- Global CloudFront CDN reduces latency
- Gzip compression enabled
- Browser caching optimized
- Regional deployment (us-west-2) for primary users

---

## [Unreleased] - Previous Plans

### Planned for Future Releases
- User authentication and login system
- Backend API deployment to AWS Lambda
- Production DynamoDB integration
- Enhanced testing coverage
- Performance monitoring and analytics
- Terraform infrastructure as code (Phase 2)

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

