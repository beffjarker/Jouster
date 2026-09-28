# Auth MFE

Standalone Authentication Micro-Frontend for Jouster.

## Features

- Γ£à Standalone deployable authentication app
- ≡ƒÄ⌐ Alice in Wonderland mock authentication for local development
- ≡ƒöÉ Real backend API integration for QA/Staging/Production
- ≡ƒÜÇ Environment-based configuration (dev/qa/staging/prod)
- ≡ƒÄ¿ Beautiful, responsive login UI
- ΓÜí Fast and lightweight

## Quick Start

### Local Development (Mock Auth)

```bash
# Start the auth-mfe app
nx serve auth-mfe

# Open browser at http://localhost:4300
```

The app will use mock authentication with Alice in Wonderland characters.

### Available Mock Users

| Username       | Password              | Role      | Avatar |
|----------------|-----------------------|-----------|--------|
| alice          | throughthelookingglass| admin     | ≡ƒæº     |
| queenofhearts  | offwithheads          | moderator | ≡ƒæ╕     |
| madhatter      | teaparty              | user      | ≡ƒÄ⌐     |
| cheshire       | grinning              | user      | ≡ƒÿ║     |
| whiterabbit    | imlate                | user      | ≡ƒÉ░     |
| caterpillar    | whoRyou               | user      | ≡ƒÉ¢     |
| marchhare      | teaparty              | user      | ≡ƒÉç     |
| dormouse       | sleepy                | user      | ≡ƒÿ┤     |
| tweedledee     | contrariwise          | user      | ≡ƒæÑ     |
| tweedledum     | contrariwise          | user      | ≡ƒæÑ     |

### Build for Different Environments

```bash
# Development (mock auth)
nx build auth-mfe --configuration=development

# QA (real API: api-qa.jouster.org)
nx build auth-mfe --configuration=qa

# Staging (real API: api-staging.jouster.org)
nx build auth-mfe --configuration=staging

# Production (real API: api.jouster.org)
nx build auth-mfe --configuration=production
```

## Environment Configuration

### Development
- Mock authentication enabled
- Alice in Wonderland users
- Console logging enabled
- Debug mode enabled

### QA
- Real backend API: `https://api-qa.jouster.org`
- For preview deployments and testing
- Console logging enabled

### Staging
- Real backend API: `https://api-staging.jouster.org`
- Pre-production testing
- Console logging disabled

### Production
- Real backend API: `https://api.jouster.org`
- Production deployment
- All debug features disabled

## Project Structure

```
apps/auth-mfe/
Γö£ΓöÇΓöÇ src/
Γöé   Γö£ΓöÇΓöÇ app/
Γöé   Γöé   Γö£ΓöÇΓöÇ components/
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ login/           # Login component
Γöé   Γöé   Γö£ΓöÇΓöÇ services/
Γöé   Γöé   Γöé   Γö£ΓöÇΓöÇ auth.service.ts           # Unified auth service
Γöé   Γöé   Γöé   Γö£ΓöÇΓöÇ mock-auth.service.ts      # Mock authentication
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ real-auth.service.ts      # Real API authentication
Γöé   Γöé   Γö£ΓöÇΓöÇ app.component.ts
Γöé   Γöé   Γö£ΓöÇΓöÇ app.routes.ts
Γöé   Γöé   ΓööΓöÇΓöÇ app.config.ts
Γöé   Γö£ΓöÇΓöÇ environments/
Γöé   Γöé   Γö£ΓöÇΓöÇ environment.ts          # Development
Γöé   Γöé   Γö£ΓöÇΓöÇ environment.qa.ts       # QA
Γöé   Γöé   Γö£ΓöÇΓöÇ environment.staging.ts  # Staging
Γöé   Γöé   ΓööΓöÇΓöÇ environment.prod.ts     # Production
Γöé   Γö£ΓöÇΓöÇ main.ts
Γöé   Γö£ΓöÇΓöÇ styles.scss
Γöé   ΓööΓöÇΓöÇ index.html
Γö£ΓöÇΓöÇ project.json
Γö£ΓöÇΓöÇ tsconfig.json
Γö£ΓöÇΓöÇ tsconfig.app.json
Γö£ΓöÇΓöÇ tsconfig.spec.json
ΓööΓöÇΓöÇ jest.config.ts
```

## Usage

### Standalone Mode

Deploy the auth-mfe independently:

```bash
# Build for QA
npm run build:auth-mfe:qa

# Deploy to S3/CloudFront
npm run deploy:auth-mfe:qa
```

Access at: `https://auth-qa.jouster.org` or `https://auth-staging.jouster.org`

### Integrated Mode

Load auth-mfe into the main jouster-ui app:

```typescript
// In jouster-ui routes
{
  path: 'auth',
  loadChildren: () => import('@auth-mfe').then(m => m.appRoutes)
}
```

## Testing

```bash
# Run unit tests
nx test auth-mfe

# Run tests with coverage
nx test auth-mfe --coverage

# Run e2e tests
nx e2e auth-mfe-e2e
```

## Deployment

### QA Deployment
```bash
npm run deploy:auth-mfe:qa
```

Deploys to: `https://auth-qa.jouster.org`

### Staging Deployment
```bash
npm run deploy:auth-mfe:staging
```

Deploys to: `https://auth-staging.jouster.org`

### Production Deployment
```bash
npm run deploy:auth-mfe:prod
```

Deploys to: `https://auth.jouster.org`

## API Endpoints

The auth-mfe expects the following backend endpoints:

- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout and invalidate token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify token validity

## Development Notes

- The app runs on port **4300** by default (vs jouster-ui on 4200)
- Mock authentication is **only enabled in development**
- All other environments use real backend API
- Tokens are stored in localStorage with prefix `jouster_`

## Security

- Never commit environment files with real API keys
- Mock passwords are **only for development** - never use in production
- HTTPS required for all non-local environments
- Tokens expire: Access tokens (24h), Refresh tokens (7d)

## Troubleshooting

### Port already in use
```bash
# Kill process on port 4300
netstat -ano | findstr :4300
taskkill /PID <process-id> /F
```

### Mock auth not working
- Check environment.ts has `useMockAuth: true`
- Check console for MockAuthService initialization log
- Verify you're running with `--configuration=development`

### Can't login with real API
- Check backend is running and accessible
- Verify API URL in environment file
- Check network tab for failed requests
- Verify CORS is configured on backend

## License

MIT

