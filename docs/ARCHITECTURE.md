# Architecture Overview

Note that this is an example architecture document for the CaTH service. It should be adapted to fit the specific architecture of your project.

## Executive Summary

The HMCTS Express Monorepo Template is a production-ready, cloud-native application platform designed to deliver accessible, secure, and scalable UK government digital services. Built on Express.js 5.x with TypeScript, it implements the GOV.UK Design System and provides comprehensive tooling for building HMCTS (HM Courts & Tribunals Service) applications.

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│                    (Browser / Mobile Device)                     │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┴────────────────────────────────────┐
│                      Application Layer                           │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │         Web Frontend (@hmcts/web)                       │     │
│  │  - Express 5.x + Nunjucks                               │     │
│  │  - GOV.UK Design System                                 │     │
│  │  - Port: 8080                                           │     │
│  └──────────────────────────┬──────────────────────────────┘     │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────┐     │
│  │         REST API (@hmcts/api)                           │     │
│  │  - Express 5.x                                          │     │
│  │  - JSON API                                             │     │
│  │  - Port: 3001                                           │     │
│  └─────────────────────────────────────────────────────────┘     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                         Data Layer                               │
│    ┌────────────────────┐           ┌─────────────────────┐      │
│    │  PostgreSQL        │           │     Redis           │      │
│    │  - Port: 5433      │           │  - Port: 6380       │      │
│    │  - Prisma ORM      │           │  - Session Store    │      │
│    └────────────────────┘           └─────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

The project uses Yarn Workspaces with Turborepo for efficient monorepo management:

```
cath-service/
├── apps/                       # Deployable applications
│   ├── api/                    # REST API service
│   │   └── src/routes/         # API routes
│   ├── web/                    # Web frontend application
│   │   └── src/
│   │       └── pages/          # All page controllers and templates
│   │           ├── (auth)/     # Route group (no URL prefix)
│   │           ├── (core)/     # Route group (no URL prefix)
│   │           ├── (list-types)/ # Route group (no URL prefix)
│   │           ├── (public)/   # Route group (no URL prefix)
│   │           ├── (verified)/ # Route group (no URL prefix)
│   │           ├── admin/      # Regular dir (/admin/* URLs)
│   │           └── system-admin/ # Regular dir (/system-admin/* URLs)
│   └── postgres/               # Database migrations
├── libs/                       # Reusable packages
│   ├── cloud-native-platform/  # Azure integration & monitoring
│   ├── simple-router/          # File-based routing system
│   └── [feature-modules]/      # Feature modules (business logic)
│       └── src/
│           ├── index.ts        # Business logic + content exports
│           ├── config.ts       # Module configuration (moduleRoot, assets)
│           ├── [page-name]/    # Page content (cy.ts, en.ts)
│           ├── locales/        # Shared translations
│           ├── views/          # Shared templates
│           └── assets/         # Module assets
├── e2e-tests/                  # Playwright E2E tests
└── docs/                       # Documentation
```

### Page Architecture

The application uses a **separation of concerns** architecture:

1. **Controllers and Templates** (`apps/web/src/pages/`):
   - Page controllers (index.ts) handle HTTP requests/responses
   - Nunjucks templates (index.njk) define page structure
   - Unit tests (index.test.ts) test controller logic
   - Auto-discovered and registered by Simple Router

2. **Content and Business Logic** (`libs/*/src/`):
   - Welsh (cy.ts) and English (en.ts) content files
   - Business logic, services, and data access
   - Exported from lib's index.ts for use in apps

3. **Route Groups**:
   - Directories with parentheses `(auth)` organize pages without URL prefixes
   - Example: `apps/web/src/pages/(auth)/login/` → `/login` (not `/auth/login`)
   - Regular directories create URL prefixes: `apps/web/src/pages/admin/dashboard/` → `/admin/dashboard`

4. **Module Registration**:
   - Pages are auto-discovered from `apps/web/src/pages/` directory
   - Single `createSimpleRouter({ path: './pages' })` handles all routes
   - Libs provide moduleRoot for Nunjucks template path registration
   - Lib assets are registered in Vite config for bundling

## Core Components

### 1. Web Frontend (`apps/web`)

**Purpose**: User-facing web application with GOV.UK Design System

**Key Technologies**:
- Express 5.x server
- Nunjucks templating engine
- GOV.UK Frontend 5.11.2
- Vite for asset bundling
- SCSS for styling
- Redis for session management

**Features**:
- Server-side rendering
- Internationalization (English & Welsh)
- WCAG 2.1 AA accessibility compliance
- Content Security Policy (CSP) with nonces
- Cookie consent management
- Progressive enhancement

**Architecture Decisions**:
- File-based routing using Simple Router with route groups
- Pages (controllers & templates) live in apps, not libs
- Content (cy.ts/en.ts) stays in libs and is imported by controllers
- Business logic in libs, presentation logic in apps
- Route groups using parentheses for organization without URL prefixes
- Single router registration handles all app pages

### 2. REST API (`apps/api`)

**Purpose**: Backend API service for data operations.

**Key Technologies**:
- Express 5.x
- TypeScript with strict mode
- Prisma ORM for database access
- CORS support

**Features**:
- RESTful endpoints
- File-based routing
- Compression middleware
- Health check endpoints
- Error handling

**API Structure**:
```
/api/
├── users/          # User management
├── users/[id]      # Dynamic routing
└── [resource]/     # Additional resources
```

### 3. Database Layer (`libs/postgres-prisma`)

**Purpose**: Data persistence and schema management

**Database Schema** (centralized in `libs/postgres-prisma/prisma/schema/`):
- One `.prisma` file per domain (e.g., `location.prisma`, `subscription.prisma`, `audit-log.prisma`)
- All schemas automatically merged by Prisma

**Key Features**:
- Prisma ORM with type-safe queries
- Snake_case database naming convention
- CamelCase TypeScript interface mapping
- Automatic migrations (managed via `apps/postgres`)
- Database connection pooling

### 4. Session Store (Redis)

**Purpose**: High-performance session storage

**Features**:
- Express session integration
- Distributed session support
- TTL-based expiration
- Append-only persistence

## Shared Libraries

### Cloud Native Platform (`libs/cloud-native-platform`)

**Purpose**: Azure cloud integration and monitoring

**Features**:
- **Properties Volume**: Kubernetes ConfigMap/Secret mounting
- **Azure Key Vault**: Secret management integration
- **Application Insights**: Telemetry and monitoring
- **Health Checks**: Kubernetes readiness/liveness probes

#### Azure Key Vault Integration

The platform provides seamless Azure Key Vault integration for secure secrets management across environments:

**Configuration Flow**:
1. **Helm Chart Definition** (`apps/web/helm/values.yaml`):
   ```yaml
   keyVaults:
     pip-ss-kv-{{ .Values.global.environment }}:
       secrets:
         - name: sso-client-id
           alias: SSO_CLIENT_ID
   ```

2. **Automatic Loading** (`libs/cloud-native-platform/src/properties-volume/azure-vault.ts`):
   - Uses `@azure/identity` with `DefaultAzureCredential` for authentication
   - Uses `@azure/keyvault-secrets` `SecretClient` to fetch secrets
   - Reads Helm chart to determine which secrets to load
   - Merges secrets into application config

3. **Application Initialization**:
   ```typescript
   // apps/web/src/app.ts
   await configurePropertiesVolume(config, {
     chartPath: path.join(__dirname, "../helm/values.yaml")
   });
   ```

**Environment-Specific Behavior**:
- **Local Development**: Reads from `.env` files via `process.env`
- **CI/Testing**: Can optionally connect to Key Vault with Azure credentials
- **Production (Kubernetes)**: Secrets mounted as files in `/mnt/secrets` by Helm chart
- **Non-Production with chartPath**: Uses Azure credentials to fetch secrets directly from Key Vault

**Key Vault Naming Convention**:
```
pip-ss-kv-{environment}
```
Where environment is: `demo`, `test`, `stg`, or `prod`

**Implementation**:
```typescript
// Automatic configuration loading
await configurePropertiesVolume(config, {
  chartPath: path.join(__dirname, "../helm/values.yaml")
});

// Health check endpoints
app.use(healthcheck()); // /health, /health/readiness, /health/liveness
```

**Configuration Priority** (highest to lowest):
1. `process.env` - Direct environment variables (local dev)
2. Config object - Populated from Key Vault or mounted volumes
3. Default values - Defined in `apps/web/config/default.json`

### Express GOV.UK Starter (`libs/express-govuk-starter`)

**Purpose**: GOV.UK Design System integration

**Components**:
- **Nunjucks Configuration**: Template engine setup
- **Asset Management**: Vite integration for SCSS/JS
- **Security Headers**: Helmet.js with CSP
- **Session Stores**: Redis and PostgreSQL adapters
- **Cookie Manager**: GDPR-compliant cookie consent
- **Error Handling**: User-friendly error pages
- **Filters**: Date, currency, time formatting

### Simple Router (`libs/simple-router`)

**Purpose**: File-based routing system

**Features**:
- Automatic route discovery
- Dynamic parameters (`[id].ts`)
- HTTP method exports
- Middleware composition
- Zero configuration
- Multi-directory mounting support

**Example**:
```typescript
// apps/api/src/routes/users/[id].ts
export const GET = async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user);
};
```

**Module Integration**:
```typescript
// apps/web/src/app.ts
const modulePaths = getModulePaths(); // Auto-discover modules
const routeMounts = modulePaths.map((dir) => ({ pagesDir: `${dir}/pages` }));
app.use(await createSimpleRouter(...routeMounts)); // Mount all module routes
```

## Scalability Design

- Stateless application design
- Redis-backed sessions for distribution
- Kubernetes HPA support

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Template Engine | Nunjucks |
| UI Framework | GOV.UK Frontend |
| Build Tool | Turbo |
| Bundler | Vite |
| Testing | Vitest, Playwright |
| Container | Docker (Multi-stage Alpine) |
| Orchestration | Kubernetes + Helm |

