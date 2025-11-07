# HMCTS Express Monorepo Template

Production-ready Node.js starter with cloud-native capabilities for building HMCTS digital services using Express.js, TypeScript and GOV.UK Design System.

## 🚀 Overview

This template provides everything you need to create accessible, secure, and scalable applications that meet GDS and HMCTS standards.

## 📋 Using This Template

This monorepo will contain all your apps, libraries, and infrastructure for your HMCTS service.

### Naming Convention

- **Team name**: Your HMCTS service (e.g., CaTH, Divorce, Civil)
- **Product name**: The specific product/service (e.g., Possessions, Money-Claims)
- If the product encompasses the whole service, use "Service"

**Examples:**
- Team: CaTH, Product: Service → `cath-service`
- Team: Civil, Product: Money-Claims → `civil-money-claims`

### Setup Steps

1. **Run the initialization script**:
```bash
./.github/scripts/init.sh
```

The script will:
- Prompt for your team name (e.g., `CaTH`)
- Prompt for your product name (e.g., `Service`)
- Replace all template values throughout the codebase
- Rebuild the yarn lockfile
- Run tests to verify everything works
- Remove itself after completion

3. **Review and commit**:
```bash
git add .
git commit -m "Initialize from template"
git push
```

## ✨ Key Features

### Cloud Native Platform
- **Health Checks**: Configurable health endpoints with readiness and liveness probes for Kubernetes deployments
- **Properties Volume**: Secure configuration management through mounted volumes with automatic environment variable injection
- **Azure Integration**: Built-in support for Azure Key Vault secrets management and properties volume mounting
- **Application Insights**: Comprehensive monitoring with Azure Application Insights including custom metrics and distributed tracing

### Express GOV.UK Starter for frontends
- **GOV.UK Design System**: Fully integrated GOV.UK Frontend with Nunjucks templates and automatic asset compilation
- **Internationalization**: Welsh language support with locale middleware and translation management system
- **Security Headers**: Pre-configured Helmet.js with CSP, HSTS, and nonce-based script protection
- **Asset Pipeline**: Vite-powered asset compilation with SCSS support and production optimization
- **Cookie Management**: Built-in support for cookie consent
- **Session Handling**: Session management using Redis or Postgres

### Simple Router  
A lightweight file-system router for Express applications, inspired by Next.js routing.

- **File-based Routing**: Maps files in directories to Express routes automatically
- **Dynamic Parameters**: Support for dynamic route segments using `[param]` syntax (e.g., `/users/[id]`)
- **HTTP Method Exports**: Export handlers for any HTTP method (GET, POST, PUT, DELETE, etc.)
- **Middleware Support**: Single handlers or arrays of middleware for complex request pipelines
- **Multiple Mount Points**: Mount different directories with different URL prefixes
- **Zero Dependencies**: Lightweight implementation with no external dependencies

### Monorepo Architecture
- Single repository for multiple applications (e.g. multiple frontends sharing common code, APIs or libraries)
- Workspace-based structure with Yarn workspaces
- Shared libraries for common functionality
- Testing with Vitest and Playwright
- Docker multi-stage builds for production
- Helm charts for Kubernetes deployment
- GitHub Actions CI/CD pipeline
- Biome for fast linting and formatting

## Project Structure

```
cath-service/
├── apps/                       # Deployable applications
│   ├── api/                    # REST API server (Express 5.x)
│   ├── web/                    # Web frontend (Express 5.x + Nunjucks)
│   └── postgres/               # Database configuration (Prisma)
├── libs/                       # Modular packages (explicitly registered)
│   ├── cloud-native-platform/  # Cloud Native Platform features
│   ├── express-gov-uk-starter/ # GOV.UK Frontend integration
│   ├── simple-router/          # Simple Router features
│   ├── footer-pages/           # Module with example footer pages
│   └── [your-module]/          # Your feature modules
│       └── src/
│           ├── pages/          # Page routes (imported in web app)
│           ├── routes/         # API routes (imported in API app)
│           ├── prisma/         # Prisma schema
│           ├── locales/        # Translations (loaded by govuk-starter)
│           └── assets/         # Module assets (compiled by vite)
├── e2e-tests/                  # End-to-end tests (Playwright)
├── docs/                       # Documentation and ADRs
└── package.json                # Root configuration
```

## 🏁 Getting Started

### Prerequisites

- Node.js 22+
- Yarn 4+
- Docker (optional, for PostgreSQL)
- Azure CLI (required for SSO - see Azure Authentication Setup below)
- mkcert (required for HTTPS in local development - see HTTPS Local Development Setup below)

### Quick Setup

```bash
# Install dependencies
yarn install

# Generate HTTPS certificates for local development
yarn workspace @hmcts/web certs:generate

# Run development server
yarn dev
```

The application will be available at **https://localhost:8080** (HTTPS only). See [HTTPS Local Development Setup](#https-local-development-setup) for more details.

### Azure Authentication Setup (One-Time Setup for SSO)

To work with SSO locally, you need to authenticate with Azure to access Key Vault secrets:

1. **Install Azure CLI** (if not already installed):
   ```bash
   # macOS
   brew install azure-cli

   # Windows
   winget install Microsoft.AzureCLI

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Login to Azure**:
   ```bash
   az login
   ```
   This will open a browser window for authentication.

3. **Set the correct subscription**:
   ```bash
   az account set --subscription <subscription-id>
   ```
   Replace `<subscription-id>` with your HMCTS subscription ID (ask your team lead if unsure).

4. **Verify your setup**:
   ```bash
   az account show
   ```

5. **Start the application**:
   ```bash
   yarn dev
   ```

**Note**: SSO secrets (client ID, client secret, group IDs, etc.) are automatically loaded from Azure Key Vault (`pip-ss-kv-stg`) when you run the application. You must be authenticated via `az login` for this to work.

### HTTPS Local Development Setup

The application requires HTTPS for local development to ensure production parity, secure cookies, and proper SSO functionality. Self-signed HTTP requests will not work - the application only serves HTTPS.

#### Why HTTPS?

- **SSO Integration**: Azure AD SSO requires HTTPS redirect URLs in production. Using HTTPS locally ensures consistent behavior.
- **Secure Cookies**: Session cookies with `secure` flag only work over HTTPS.
- **Production Parity**: Deployed environments use HTTPS, so local development should match.

#### Setup Instructions

1. **Install mkcert** (if not already installed):

   ```bash
   # macOS
   brew install mkcert

   # Windows
   choco install mkcert

   # Linux (Debian/Ubuntu)
   sudo apt install libnss3-tools
   wget https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
   sudo mv mkcert-v1.4.4-linux-amd64 /usr/local/bin/mkcert
   sudo chmod +x /usr/local/bin/mkcert

   # Other Linux distributions
   # See https://github.com/FiloSottile/mkcert#installation
   ```

2. **Install local CA** (one-time setup):

   ```bash
   mkcert -install
   ```

   This installs mkcert's root certificate in your system's trust store, so certificates generated by mkcert will be trusted by your browser without warnings.

3. **Generate certificates**:

   ```bash
   yarn workspace @hmcts/web certs:generate
   ```

   This creates:
   - `apps/web/certs/localhost.pem` (certificate)
   - `apps/web/certs/localhost-key.pem` (private key)

4. **Start the application**:

   ```bash
   yarn dev
   ```

   You should see: `🔒 Web server running on https://localhost:8080`

5. **Access the application**:

   Open **https://localhost:8080** in your browser (note the `https://`).

   ⚠️ **HTTP will not work**: If you try `http://localhost:8080`, you will get a connection error. The application only serves HTTPS when certificates are present.

#### Troubleshooting

**Browser shows "Not Secure" warning:**
- Run `mkcert -install` to install the local CA
- Restart your browser after installation

**"Connection refused" error:**
- Check that certificates exist: `ls apps/web/certs/`
- Regenerate certificates: `yarn workspace @hmcts/web certs:generate`
- Check the server is running: `yarn dev`

**Server uses HTTP instead of HTTPS:**
- Certificates are missing - run `yarn workspace @hmcts/web certs:generate`
- Check that certificates exist in `apps/web/certs/`

**Certificates expired or need regeneration:**
```bash
# Remove old certificates
rm -rf apps/web/certs/

# Generate new certificates
yarn workspace @hmcts/web certs:generate
```

### Docker Services

The development environment uses Docker Compose for PostgreSQL and Redis. Note that **non-standard ports** are used to avoid conflicts with local installations:

| Service | Port | Standard Port |
|---------|------|---------------|
| PostgreSQL | 5433 | 5432 |
| Redis | 6380 | 6379 |

If you need to connect to these services directly:

```bash
# PostgreSQL
psql -h localhost -p 5433 -U postgres -d postgres

# Redis CLI
redis-cli -p 6380
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Web Application | https://localhost:8080 | Main web interface with GOV.UK styling (HTTPS only) |
| API Server | http://localhost:3001 | REST API backend |
| Prisma Studio | Run `yarn workspace @hmcts/postgres run studio` | Database management UI |

## 🔐 Configuration & Secrets Management

### Environment Configuration Strategy

The application uses a three-tier configuration approach to handle different deployment scenarios:

#### 1. Local Development (Azure Key Vault + .env files)
For local development, configuration is split between Azure Key Vault (for sensitive SSO secrets) and `.env` files (for local configuration):

**Secrets loaded from Azure Key Vault** (requires `az login`):
- `SSO_CLIENT_ID` - Azure AD application client ID
- `SSO_CLIENT_SECRET` - Azure AD application client secret
- `SSO_IDENTITY_METADATA` - OpenID Connect metadata endpoint
- `SSO_SYSTEM_ADMIN_GROUP_ID` - System admin Azure AD group ID
- `SSO_INTERNAL_ADMIN_CTSC_GROUP_ID` - CTSC admin Azure AD group ID
- `SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID` - Local admin Azure AD group ID

**Local configuration in `.env` files**:
```bash
# apps/web/.env
PORT=8080
BASE_URL=https://localhost:8080
SESSION_SECRET=your-session-secret
REDIS_URL=redis://localhost:6380
SSO_ALLOW_HTTP_REDIRECT=true
# ... other non-sensitive configuration
```

- The `.env` file contains only local configuration (ports, URLs, etc.)
- Sensitive SSO secrets are never stored in `.env` files
- Never commit `.env` files to version control

#### 2. Azure Key Vault Configuration

**Local Development:**
- Vault: `pip-ss-kv-stg`
- Secrets: Uses `-dev` suffixed secret names (e.g., `sso-client-id-dev`)
- Authentication: Requires `az login` with appropriate subscription

**Deployed Environments (demo, test, stg, prod):**
- Vault: `pip-ss-kv-{ENV}` (e.g., `pip-ss-kv-prod`)
- Secrets: Uses production secret names (e.g., `sso-client-id`)
- Authentication: Automatic via managed identity

**Configured Secrets:**

| Azure Key Vault Secret | Environment Variable | Description |
|------------------------|---------------------|-------------|
| `sso-client-id` | `SSO_CLIENT_ID` | Azure AD application client ID |
| `sso-client-secret` | `SSO_CLIENT_SECRET` | Azure AD application client secret |
| `sso-config-endpoint` | `SSO_IDENTITY_METADATA` | OpenID Connect metadata endpoint |
| `sso-sg-system-admin` | `SSO_SYSTEM_ADMIN_GROUP_ID` | System admin Azure AD group ID |
| `sso-sg-admin-ctsc` | `SSO_INTERNAL_ADMIN_CTSC_GROUP_ID` | CTSC admin Azure AD group ID |
| `sso-sg-admin-local` | `SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID` | Local admin Azure AD group ID |

#### 3. How It Works

The application automatically determines how to load configuration:

1. **Process Environment Variables** (Local Development):
   - Reads from `process.env`
   - Populated from `.env` files
   - Highest priority

2. **Azure Key Vault** (Deployed Environments):
   - Helm chart configures Key Vault integration (`apps/web/helm/values.yaml`)
   - Secrets mounted as environment variables in Kubernetes pods
   - Automatic via `configurePropertiesVolume()` in `libs/cloud-native-platform`

3. **Configuration Object** (Fallback):
   - Uses Node.js `config` library
   - Mapping defined in `apps/web/config/custom-environment-variables.json`

#### SSO Redirect URL Configuration

The SSO redirect URL is automatically constructed from the `BASE_URL` environment variable:

```typescript
// Redirect URL: {BASE_URL}/sso/return

// Local development
BASE_URL=https://localhost:8080
// Results in: https://localhost:8080/sso/return

// Production (via Helm chart)
BASE_URL=https://cath-web.prod.platform.hmcts.net
// Results in: https://cath-web.prod.platform.hmcts.net/sso/return
```

#### Adding New Secrets

To add a new secret to the Key Vault integration:

1. Add the secret to each Key Vault (demo, test, stg, prod)
2. Update `apps/web/helm/values.yaml`:
```yaml
keyVaults:
  pip-ss-kv-{{ .Values.global.environment }}:
    secrets:
      - name: my-secret-name      # Key Vault secret name
        alias: MY_ENV_VAR         # Environment variable name
```
3. Update `apps/web/config/custom-environment-variables.json`:
```json
{
  "MY_ENV_VAR": "MY_ENV_VAR"
}
```
4. Add to `.env` and `.env.example` for local development

## 📦 Development

### Available Commands

```bash
# Development
yarn dev                        # Start all services concurrently

# Testing
yarn test                       # Run all tests across workspaces
yarn test:e2e                   # Playwright E2E tests
yarn test:coverage              # Generate coverage report

# Code Quality
yarn lint:fix                    # Run Biome linter
yarn format                     # Format code with Biome

# Database Operations
yarn db:migrate                 # Apply migrations  
yarn db:migrate:dev             # Auto apply migrations, add new migrations if necessary
yarn db:generate                # Generate the Prisma client
yarn db:studio                  # Open Prisma Studio
yarn db:drop                    # Drop all tables and reset the database
```

### Creating a New Feature Module

1. **Create module structure**:
```bash
mkdir -p libs/my-feature/src/pages      # Page controllers and templates
mkdir -p libs/my-feature/src/locales    # Translation files (optional)
mkdir -p libs/my-feature/src/assets/css # Module styles (optional)
mkdir -p libs/my-feature/src/assets/js  # Module scripts (optional)
cd libs/my-feature
```

2. **Initialize package.json**:
```json
{
  "name": "@hmcts/my-feature",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc && yarn build:nunjucks",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\;",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```
**Note**: The `build:nunjucks` script is required if your module contains Nunjucks templates.

3. **Create tsconfig.json**:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules", "src/assets/"]
}
```

4. **Register module in root tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      // ... existing paths ...
      "@hmcts/my-feature": ["libs/my-feature/src"]
    }
  }
}
```

5. **Create src/index.ts with module exports**:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Business logic exports
export * from "./my-feature/service.js";

// Module configuration for app registration
export const pageRoutes = { path: path.join(__dirname, "pages") };
export const apiRoutes = { path: path.join(__dirname, "routes") };
export const prismaSchemas = path.join(__dirname, "../prisma");
export const assets = path.join(__dirname, "assets/");
```

6. **Register module in applications**:
   - **For web app** (if module has pages): Add import and route to `apps/web/src/app.ts`
   - **For API app** (if module has routes): Add import and route to `apps/api/src/app.ts`
   - **For database schemas** (if module has prisma): Add import to `apps/postgres/src/index.ts`
   - **Add dependency** to relevant app package.json files: `"@hmcts/my-feature": "workspace:*"`

## 🧪 Testing Strategy

| Type | Tool | Location | Purpose |
|------|------|----------|---------|
| **Unit Tests** | Vitest | Co-located `*.test.ts` | Business logic validation |
| **E2E Tests** | Playwright | `e2e-tests/` | User journey validation |
| **Accessibility Tests** | Axe-core + Playwright | `e2e-tests/` | WCAG 2.1 AA compliance |

```bash
# Run specific test suites
yarn test                   # Unit tests
yarn test:e2e               # E2E tests
yarn test:coverage          # Coverage report
```

## Security

The GitHub Action pipelines contain a number of security checks, including:

- **Dependency Scanning**: Automatically scans for vulnerabilities in dependencies
- **SonarQube**: SAST analysis for code quality and security
- **Claude Security Scans**: Claude AI-powered security scans for code vulnerabilities

## License

MIT
