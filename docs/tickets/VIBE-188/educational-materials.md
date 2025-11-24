# Quality Metrics Guide for HMCTS Express Monorepo

**Version**: 1.0
**Last Updated**: November 2025
**Maintainer**: HMCTS VIBE Pilot Team

## Table of Contents

1. [Introduction to Quality Metrics](#introduction-to-quality-metrics)
2. [Core Quality Metrics](#core-quality-metrics)
   - [Test Coverage](#test-coverage)
   - [CVEs (Common Vulnerabilities and Exposures)](#cves-common-vulnerabilities-and-exposures)
   - [Duplicated Code](#duplicated-code)
   - [Maintainability](#maintainability)
   - [Reliability](#reliability)
   - [Security](#security)
3. [VIBE Pilot Application](#vibe-pilot-application)
4. [Success Criteria: What Good Looks Like](#success-criteria-what-good-looks-like)
5. [Developer Workflow Integration](#developer-workflow-integration)
6. [Troubleshooting and FAQ](#troubleshooting-and-faq)
7. [Further Reading](#further-reading)

---

## Introduction to Quality Metrics

Quality metrics are automated measurements that help us maintain high standards in our codebases. For HMCTS digital services, quality metrics are essential because:

- **Service Reliability**: Government services must be available and working correctly when citizens need them
- **Security**: Protecting sensitive citizen data is a legal and ethical requirement
- **Maintainability**: Code that's easy to understand and modify reduces costs and delivery time
- **Compliance**: Meeting GDS (Government Digital Service) and HMCTS service standards

### How Automated Quality Analysis Works

The VIBE pilot uses several tools to automatically analyze code quality:

- **SonarQube/SonarCloud**: Static code analysis for maintainability, reliability, and security
- **Vitest**: Test runner with code coverage reporting
- **OSV Scanner**: Dependency vulnerability scanning
- **GitHub Actions**: Continuous integration pipeline running quality checks on every PR

Quality metrics are collected automatically:
1. Developer creates a pull request
2. CI/CD pipeline runs tests and generates coverage reports
3. SonarQube analyzes code for quality issues
4. OSV Scanner checks dependencies for known vulnerabilities
5. Results are posted back to the pull request for review

### Where to View Quality Metrics

**SonarCloud Dashboard**: [https://sonarcloud.io/project/overview?id=hmcts.cath](https://sonarcloud.io/project/overview?id=hmcts.cath)
- View overall quality ratings (A-E scale)
- Track technical debt and code smells
- Review security hotspots and vulnerabilities
- Monitor test coverage trends

**GitHub Security Tab**: View CVE alerts and dependency vulnerabilities
**PR Comments**: SonarQube automatically comments on pull requests with quality analysis

---

## Core Quality Metrics

### Test Coverage

#### What Is Test Coverage?

Test coverage measures the percentage of your code that is executed during automated tests. It answers the question: "How much of my code is actually being tested?"

**Types of Coverage**:
- **Line Coverage**: Percentage of code lines executed during tests
- **Branch Coverage**: Percentage of conditional branches (if/else) tested
- **Function Coverage**: Percentage of functions called during tests

#### Why Test Coverage Matters

- **Confidence**: Higher coverage means more confidence that changes won't break existing functionality
- **Bug Prevention**: Tested code is less likely to contain undetected bugs
- **Refactoring Safety**: Good test coverage allows safe refactoring and modernization
- **Documentation**: Tests serve as executable documentation of how code should behave

#### How Coverage Is Measured

The VIBE pilot uses Vitest with the V8 coverage provider:

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/locales/**',
        '**/en.ts',
        '**/cy.ts',
        '**/mock-*.ts'
      ]
    }
  }
});
```

Coverage reports are generated in LCOV format and merged across all workspaces:

```bash
# Generate coverage for all packages
yarn test:coverage

# View HTML coverage report
open coverage/index.html
```

#### VIBE Pilot Coverage Configuration

**Exclusions** (from `sonar-project.properties`):
- `**/node_modules/**` - Third-party dependencies
- `**/dist/**` - Compiled output
- `**/prisma/migrations/**` - Database migrations
- `**/locales/**` - Translation files (en.ts, cy.ts)
- `**/mock-*.ts` - Mock data files

**Current Target**: >80% coverage for business logic

#### Example: Writing Tests for Coverage

```typescript
// user-service.ts (business logic)
export class UserService {
  async findUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

// user-service.test.ts (test with coverage)
import { describe, it, expect, vi } from 'vitest';
import { UserService } from './user-service.js';

vi.mock('@hmcts/postgres', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

describe('UserService', () => {
  it('should return user when found', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const service = new UserService();
    const user = await service.findUserById('123');

    expect(user).toEqual(mockUser);
  });

  it('should throw error when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new UserService();

    await expect(service.findUserById('999')).rejects.toThrow('User not found');
  });
});
```

This test achieves 100% coverage by testing:
- The happy path (user found)
- The error path (user not found)
- All branches in the code

#### Common Coverage Issues and Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| Low coverage in controllers | Controllers not tested | Add integration tests for GET/POST handlers |
| Low branch coverage | Not testing all if/else paths | Add tests for each conditional branch |
| Coverage drops in CI | Different test execution | Ensure test environment matches CI |
| Generated code in coverage | Prisma client included | Add to exclusions in vitest config |

---

### CVEs (Common Vulnerabilities and Exposures)

#### What Are CVEs?

CVEs are publicly disclosed security vulnerabilities in software components. Each CVE has:
- **Unique ID**: e.g., CVE-2024-12345
- **Severity Rating**: Critical, High, Medium, Low
- **Description**: What the vulnerability does
- **Affected Versions**: Which versions are vulnerable
- **Fix**: Patched version or mitigation steps

#### Why CVE Scanning Matters

- **Security Compliance**: HMCTS services must meet government security standards
- **Data Protection**: Vulnerabilities can lead to data breaches
- **Service Availability**: Some CVEs enable denial-of-service attacks
- **Legal Obligation**: GDPR requires appropriate security measures

#### How CVE Scanning Works

The VIBE pilot uses **OSV Scanner** (Open Source Vulnerabilities Scanner):

```yaml
# .github/workflows/osv-scanner.yml
name: Security

on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  scan:
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.3.0
    with:
      scan-args: |-
        --config=.github/osv-scanner.toml
        ./
```

**Scanning Schedule**:
- **On Pull Requests**: Scans changed dependencies
- **On Main Branch Push**: Full scan after merge
- **Daily (2 AM)**: Scheduled scan to detect new CVEs

#### CVE Severity Levels

| Severity | CVSS Score | Impact | Response Time |
|----------|-----------|--------|---------------|
| **Critical** | 9.0-10.0 | Immediate risk of exploitation | Fix immediately (same day) |
| **High** | 7.0-8.9 | Significant security risk | Fix within 7 days |
| **Medium** | 4.0-6.9 | Moderate security risk | Fix within 30 days |
| **Low** | 0.1-3.9 | Limited security risk | Fix in next sprint |

#### VIBE Pilot CVE Configuration

**OSV Scanner Config** (`.github/osv-scanner.toml`):

```toml
# OSV Scanner Configuration
[[IgnoredVulns]]
id = "GHSA-example-id"
reason = "This vulnerability doesn't affect our usage because we don't use the affected feature"
ignoreUntil = "2025-12-31T00:00:00Z"
```

**When to Ignore a CVE**:
- The vulnerable code path is not used in your application
- A fix is not available, but the risk is mitigated by other controls
- The vulnerability requires conditions that don't exist in your deployment

**Always document ignored CVEs** with:
- Clear reason why it's safe to ignore
- Expiry date to force re-evaluation
- Link to risk assessment or security review

#### Responding to CVEs

**Step 1: Assess the Impact**
- Read the CVE description
- Determine if the vulnerability affects your code
- Check CVSS score and severity

**Step 2: Check for Updates**
```bash
# Check for available updates
yarn outdated

# Update a specific package
yarn upgrade [package-name]@latest
```

**Step 3: Test the Update**
```bash
# Run tests to ensure compatibility
yarn test

# Run E2E tests
yarn test:e2e

# Check for breaking changes
yarn build
```

**Step 4: Create PR**
```bash
# Create a branch
git checkout -b fix/cve-2024-12345

# Commit changes
git add yarn.lock package.json
git commit -m "fix(deps): update [package] to fix CVE-2024-12345"

# Push and create PR
git push origin fix/cve-2024-12345
```

**Step 5: Document in PR**
```markdown
## Fix CVE-2024-12345

**Severity**: High
**Package**: express-jwt@8.4.1
**Fix**: Upgrade to express-jwt@9.0.0

### Changes
- Updated express-jwt from 8.4.1 to 9.0.0
- Updated related dependencies

### Testing
- All unit tests passing
- E2E tests passing
- Manual testing of authentication flows

### Security Impact
This fixes a vulnerability that could allow JWT token forgery in specific scenarios.
```

---

### Duplicated Code

#### What Is Duplicated Code?

Duplicated code (also called code duplication or clones) occurs when identical or very similar code blocks appear multiple times in the codebase.

**Types of Duplication**:
- **Exact Duplicates**: Identical code copied and pasted
- **Structural Duplicates**: Same logic with different variable names
- **Semantic Duplicates**: Different code that achieves the same result

#### Why Duplication Matters

- **Maintenance Burden**: Bugs must be fixed in multiple places
- **Inconsistency Risk**: One copy gets updated, others don't
- **Increased Codebase Size**: More code to read, understand, and maintain
- **Higher Complexity**: Harder to understand system behavior

#### How Duplication Is Detected

SonarQube uses Copy-Paste Detection (CPD):
- Identifies code blocks with 100+ duplicated tokens
- Reports duplication percentage across the codebase
- Highlights duplicated blocks in the UI

**Configuration** (from `sonar-project.properties`):
```properties
sonar.cpd.exclusions=apps/web/src/pages/**,libs/**/src/pages/**
```

#### VIBE Pilot Duplication Configuration

**Exclusions**:
- `apps/web/src/pages/**` - Page controller templates
- `libs/**/src/pages/**` - Module page templates

**Why Pages Are Excluded**:
Page controllers often have similar structure (GET/POST handlers, validation, rendering):

```typescript
// Typical page structure (intentionally similar)
export const GET = async (req: Request, res: Response) => {
  const data = await fetchData();
  res.render('page-name', { data });
};

export const POST = async (req: Request, res: Response) => {
  const errors = validate(req.body);
  if (errors) {
    return res.render('page-name', { errors });
  }
  await saveData(req.body);
  res.redirect('/success');
};
```

This repetitive structure is acceptable because:
- It follows a consistent pattern
- It's idiomatic for Express page controllers
- Extracting it would reduce readability

**Current Target**: <3% duplicated lines

#### Refactoring Duplicated Code

**Before (Duplication)**:
```typescript
// libs/location/src/repository/service.ts
export async function findCourtById(id: string) {
  const court = await prisma.court.findUnique({ where: { id } });
  if (!court) {
    throw new Error('Court not found');
  }
  return court;
}

// libs/publication/src/repository/service.ts
export async function findPublicationById(id: string) {
  const publication = await prisma.publication.findUnique({ where: { id } });
  if (!publication) {
    throw new Error('Publication not found');
  }
  return publication;
}
```

**After (Refactored)**:
```typescript
// libs/shared/src/repository/base-repository.ts
export async function findOneOrThrow<T>(
  model: PrismaModel<T>,
  id: string,
  entityName: string
): Promise<T> {
  const entity = await model.findUnique({ where: { id } });
  if (!entity) {
    throw new Error(`${entityName} not found`);
  }
  return entity;
}

// libs/location/src/repository/service.ts
import { findOneOrThrow } from '@hmcts/shared';

export async function findCourtById(id: string) {
  return findOneOrThrow(prisma.court, id, 'Court');
}

// libs/publication/src/repository/service.ts
import { findOneOrThrow } from '@hmcts/shared';

export async function findPublicationById(id: string) {
  return findOneOrThrow(prisma.publication, id, 'Publication');
}
```

**Benefits**:
- Single source of truth for the pattern
- Consistent error messages
- Easier to add features (logging, caching, etc.)
- Reduced duplication percentage

#### When Duplication Is Acceptable

- **Page templates**: Similar structure is expected
- **Test setup**: Repeated test fixtures for clarity
- **Configuration**: Similar config objects for different environments
- **Generated code**: Prisma client, API types, etc.
- **Small snippets**: 3-4 lines of common setup code

**Rule of Thumb**: If extracting the duplication makes the code harder to understand, leave it as is.

---

### Maintainability

#### What Is Maintainability?

Maintainability measures how easy it is to understand, modify, and extend code. SonarQube calculates a maintainability rating (A-E) based on:

- **Technical Debt**: Estimated time to fix all maintainability issues
- **Code Smells**: Patterns that make code harder to maintain
- **Complexity**: Cyclomatic complexity of functions and modules
- **Code Size**: Lines of code in functions and files

#### Why Maintainability Matters

- **Development Speed**: Maintainable code is faster to modify
- **Bug Reduction**: Simple code has fewer hiding places for bugs
- **Onboarding**: New developers can understand maintainable code faster
- **Cost**: Lower technical debt means lower long-term costs

#### Maintainability Rating

SonarQube uses a 5-point scale:

| Rating | Technical Debt Ratio | Meaning |
|--------|---------------------|---------|
| **A** | ≤5% | Excellent maintainability |
| **B** | 6-10% | Good maintainability |
| **C** | 11-20% | Moderate maintainability |
| **D** | 21-50% | Poor maintainability |
| **E** | >50% | Very poor maintainability |

**Technical Debt Ratio** = (Remediation Cost / Development Cost) × 100%

- **Remediation Cost**: Estimated time to fix all issues
- **Development Cost**: Estimated time to write the code

**Target**: A rating (≤5% technical debt ratio)

#### Common Code Smells

**1. Long Functions**
- Functions with >20 lines of code
- Functions with >3 parameters
- Functions with deep nesting (>3 levels)

**Bad Example**:
```typescript
export function processUserData(user, options, callback, errorHandler, logger) {
  if (user) {
    if (user.email) {
      if (validateEmail(user.email)) {
        if (options.sendEmail) {
          // ... 50 more lines
        }
      }
    }
  }
}
```

**Good Example**:
```typescript
export function processUserData(user: User) {
  validateUser(user);
  sendNotificationIfRequired(user);
  return updateUserProfile(user);
}

function validateUser(user: User) {
  if (!user.email || !validateEmail(user.email)) {
    throw new Error('Invalid email');
  }
}

function sendNotificationIfRequired(user: User) {
  if (user.preferences.emailNotifications) {
    sendEmail(user.email);
  }
}
```

**2. Cognitive Complexity**
- Code that's hard to understand
- Multiple nested conditionals
- Mixed levels of abstraction

**Bad Example**:
```typescript
export function calculateDiscount(user, cart, promocode) {
  let discount = 0;
  if (user && user.loyaltyPoints > 100) {
    discount = 10;
    if (cart.total > 50) {
      discount = 15;
      if (promocode && promocode.type === 'SPECIAL') {
        discount = 20;
      }
    }
  } else if (promocode) {
    discount = 5;
  }
  return discount;
}
```

**Good Example**:
```typescript
export function calculateDiscount(user: User, cart: Cart, promocode?: Promocode) {
  if (hasSpecialPromocode(promocode)) {
    return 20;
  }

  if (hasLoyaltyDiscount(user, cart)) {
    return getLoyaltyDiscount(cart);
  }

  if (hasBasicPromocode(promocode)) {
    return 5;
  }

  return 0;
}

function hasSpecialPromocode(promocode?: Promocode): boolean {
  return promocode?.type === 'SPECIAL';
}

function hasLoyaltyDiscount(user: User, cart: Cart): boolean {
  return user.loyaltyPoints > 100;
}

function getLoyaltyDiscount(cart: Cart): number {
  return cart.total > 50 ? 15 : 10;
}

function hasBasicPromocode(promocode?: Promocode): boolean {
  return !!promocode;
}
```

**3. Duplicate Logic**
- Similar conditional checks repeated
- Similar transformations repeated

**4. Magic Numbers**
- Hardcoded numbers without explanation

**Bad Example**:
```typescript
if (user.age > 18 && user.accountAge > 365) {
  // What do these numbers mean?
}
```

**Good Example**:
```typescript
const MINIMUM_AGE = 18;
const MINIMUM_ACCOUNT_AGE_DAYS = 365;

if (user.age > MINIMUM_AGE && user.accountAge > MINIMUM_ACCOUNT_AGE_DAYS) {
  // Clear intent
}
```

#### VIBE Pilot Maintainability Practices

The VIBE pilot follows principles from `CLAUDE.md`:

**1. YAGNI (You Aren't Gonna Need It)**
- Don't add speculative features
- Write only the code you need now
- Simple solutions over complex ones

**2. KISS (Keep It Simple, Stupid)**
- Avoid unnecessary complexity
- Prefer simple, obvious code
- Don't over-engineer

**3. Functional Style**
- Favor pure functions (no side effects)
- Use immutable data (const, no mutations)
- Compose small functions

**Example**:
```typescript
// Bad: Imperative with mutations
function processUsers(users) {
  for (let i = 0; i < users.length; i++) {
    users[i].processed = true;
    users[i].processedAt = new Date();
  }
  return users;
}

// Good: Functional with immutability
function processUsers(users: User[]): ProcessedUser[] {
  return users.map(user => ({
    ...user,
    processed: true,
    processedAt: new Date()
  }));
}
```

**4. Module Organization** (from `CLAUDE.md`):
- Constants at the top
- Exported functions next
- Helper functions in order of use
- Interfaces and types at the bottom

**5. Specific File Names**
- No `utils.ts` or `types.ts`
- Use specific names: `date-formatting.ts`, `user-types.ts`

---

### Reliability

#### What Is Reliability?

Reliability measures the likelihood that code will function correctly without bugs. SonarQube calculates a reliability rating (A-E) based on:

- **Bug Count**: Number of detected bugs
- **Bug Severity**: Impact of each bug
- **Error Handling**: Proper handling of exceptions and edge cases

#### Why Reliability Matters

- **User Trust**: Government services must work reliably
- **Data Integrity**: Bugs can corrupt or lose data
- **Service Availability**: Bugs can cause crashes or downtime
- **Reputation**: Unreliable services damage public trust

#### Reliability Rating

| Rating | Bug Count | Meaning |
|--------|-----------|---------|
| **A** | 0 bugs | Highly reliable |
| **B** | ≥1 minor bug | Generally reliable |
| **C** | ≥1 major bug | Moderate reliability |
| **D** | ≥1 critical bug | Poor reliability |
| **E** | ≥1 blocker bug | Very poor reliability |

**Target**: A rating (0 bugs)

#### Common Reliability Issues

**1. Unhandled Promises**
```typescript
// Bad: Unhandled promise rejection
async function fetchData() {
  fetch('https://api.example.com/data'); // No await, no error handling
}

// Good: Proper async handling
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch data', error);
    throw error;
  }
}
```

**2. Null/Undefined Access**
```typescript
// Bad: Potential null pointer
function getUserEmail(user) {
  return user.profile.email; // What if profile is null?
}

// Good: Safe navigation
function getUserEmail(user: User): string | null {
  return user?.profile?.email ?? null;
}
```

**3. Array Index Out of Bounds**
```typescript
// Bad: Unsafe array access
function getFirstItem(items) {
  return items[0]; // What if items is empty?
}

// Good: Safe array access
function getFirstItem(items: string[]): string | undefined {
  return items.at(0);
}
```

**4. Type Coercion Issues**
```typescript
// Bad: Implicit type coercion
function add(a, b) {
  return a + b; // "1" + "2" = "12" (not 3)
}

// Good: Explicit types
function add(a: number, b: number): number {
  return a + b;
}
```

#### Error Handling Patterns

**Express Middleware Error Handling**:
```typescript
// Good: Async middleware with error handling
export const authenticate = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).render('errors/401');
      }

      const user = await verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      logger.error('Authentication failed', error);
      res.status(401).render('errors/401');
    }
  };
};
```

**Repository Error Handling**:
```typescript
// Good: Repository with clear error handling
export async function findCourtById(id: string): Promise<Court> {
  try {
    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new NotFoundError(`Court with id ${id} not found`);
    }
    return court;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Database error finding court', { id, error });
    throw new DatabaseError('Failed to retrieve court');
  }
}
```

#### Testing for Reliability

**Test Edge Cases**:
```typescript
describe('getUserEmail', () => {
  it('should return email when user has profile', () => {
    const user = { profile: { email: 'test@example.com' } };
    expect(getUserEmail(user)).toBe('test@example.com');
  });

  it('should return null when user has no profile', () => {
    const user = {};
    expect(getUserEmail(user)).toBeNull();
  });

  it('should return null when profile has no email', () => {
    const user = { profile: {} };
    expect(getUserEmail(user)).toBeNull();
  });

  it('should return null when user is null', () => {
    expect(getUserEmail(null)).toBeNull();
  });
});
```

---

### Security

#### What Is Security?

Security measures protection against vulnerabilities and threats. SonarQube calculates a security rating (A-E) based on:

- **Security Vulnerabilities**: Critical security flaws
- **Security Hotspots**: Code that requires manual security review
- **Security Standards**: Compliance with OWASP, CWE, SANS

#### Why Security Matters

- **Data Protection**: HMCTS services handle sensitive citizen data
- **GDPR Compliance**: Legal requirement to protect personal data
- **Public Trust**: Security breaches damage trust in government services
- **Service Continuity**: Security incidents can cause service outages

#### Security Rating

| Rating | Vulnerability Count | Meaning |
|--------|-------------------|---------|
| **A** | 0 vulnerabilities | Highly secure |
| **B** | ≥1 minor vulnerability | Generally secure |
| **C** | ≥1 major vulnerability | Moderate security |
| **D** | ≥1 critical vulnerability | Poor security |
| **E** | ≥1 blocker vulnerability | Very poor security |

**Target**: A rating (0 vulnerabilities)

#### OWASP Top 10 Considerations

The VIBE pilot addresses OWASP Top 10 2021:

| OWASP Risk | VIBE Pilot Mitigation |
|------------|----------------------|
| **A01: Broken Access Control** | Role-based authorization middleware |
| **A02: Cryptographic Failures** | HTTPS everywhere, encrypted sessions |
| **A03: Injection** | Parameterized queries (Prisma) |
| **A04: Insecure Design** | Security by design, threat modeling |
| **A05: Security Misconfiguration** | Helmet.js security headers |
| **A06: Vulnerable Components** | OSV Scanner, dependency updates |
| **A07: Authentication Failures** | Azure AD SSO, session management |
| **A08: Data Integrity Failures** | Input validation, CSP |
| **A09: Logging Failures** | Application Insights monitoring |
| **A10: SSRF** | URL validation, network restrictions |

#### Security Best Practices

**1. Input Validation**

Always validate and sanitize user input:

```typescript
import { z } from 'zod';

// Define validation schema
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['admin', 'user'])
});

// Validate in controller
export const POST = async (req: Request, res: Response) => {
  try {
    const data = UserSchema.parse(req.body);
    await createUser(data);
    res.redirect('/success');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.render('form', { errors: error.errors });
    }
    throw error;
  }
};
```

**2. Parameterized Queries**

Always use Prisma's parameterized queries (never raw SQL with user input):

```typescript
// Good: Parameterized query
export async function findCourtByName(name: string) {
  return prisma.court.findFirst({
    where: { name }
  });
}

// Bad: SQL injection vulnerability
export async function findCourtByName(name: string) {
  return prisma.$queryRawUnsafe(`SELECT * FROM court WHERE name = '${name}'`);
}
```

**3. Security Headers (Helmet.js)**

The VIBE pilot uses Helmet.js for security headers:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' }
}));
```

**4. Authentication Middleware**

```typescript
// libs/auth/src/middleware/authenticate.ts
export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.redirect('/login');
      }
      next();
    } catch (error) {
      logger.error('Authentication failed', error);
      res.status(401).render('errors/401');
    }
  };
}
```

**5. Authorization Middleware**

```typescript
// libs/auth/src/middleware/authorise.ts
export function authorise(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).render('errors/401');
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).render('errors/403');
    }

    next();
  };
}

// Usage in routes
app.get('/admin/dashboard',
  authenticate(),
  authorise(['system_admin']),
  (req, res) => {
    res.render('admin-dashboard');
  }
);
```

**6. Session Security**

```typescript
// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // No JavaScript access
    sameSite: 'lax',     // CSRF protection
    maxAge: 3600000      // 1 hour
  },
  store: new RedisStore({
    client: redisClient
  })
}));
```

#### Security Hotspot Review

**What Are Security Hotspots?**

Security hotspots are code patterns that *might* be vulnerabilities. They require manual review to determine if they're actually risky.

**Common Hotspots**:
- Hardcoded credentials
- Weak cryptography
- Insecure cookie configuration
- File upload without validation
- Eval or dynamic code execution

**Example: File Upload Hotspot**

```typescript
// Security hotspot: File upload without validation
export const POST = async (req: Request, res: Response) => {
  const file = req.file;
  await saveFile(file);
  res.redirect('/success');
};

// Fixed: Proper file validation
export const POST = async (req: Request, res: Response) => {
  const file = req.file;

  // Validate file type
  const allowedTypes = ['application/pdf', 'application/json'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.render('upload', {
      error: 'Invalid file type. Only PDF and JSON files are allowed.'
    });
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.render('upload', {
      error: 'File too large. Maximum size is 10MB.'
    });
  }

  // Sanitize filename
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

  await saveFile({
    ...file,
    filename: sanitizedFilename
  });

  res.redirect('/success');
};
```

---

## VIBE Pilot Application

### Current Quality Dashboard

**SonarCloud Project**: [https://sonarcloud.io/project/overview?id=hmcts.cath](https://sonarcloud.io/project/overview?id=hmcts.cath)

### Quality Baseline (As of November 2025)

| Metric | Current Status | Target |
|--------|---------------|--------|
| Test Coverage | 75% | 85% by Q2 2025 |
| CVEs (Critical) | 0 | 0 |
| CVEs (High) | 0 | 0 |
| Duplicated Lines | 2.8% | <3% |
| Maintainability | A | A |
| Reliability | A | A |
| Security | A | A |

### Integration Points

#### 1. GitHub Actions CI/CD

**Test Workflow** (`.github/workflows/test.yml`):
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests for changed packages
        run: npx turbo test --filter="...[origin/${{ github.base_ref }}]" -- --coverage

      - name: Merge coverage reports
        run: npx lcov-result-merger **/coverage/lcov.info lcov.info

      - name: Upload coverage artifacts
        uses: actions/upload-artifact@v5
        with:
          name: coverage-reports-${{ github.run_id }}
          path: 'lcov.info'

  sonarqube:
    needs: test
    steps:
      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

#### 2. SonarCloud Configuration

**Project Config** (`sonar-project.properties`):
```properties
sonar.projectKey=hmcts.cath
sonar.projectName=future-hearings :: CaTH
sonar.organization=hmcts

sonar.sources=apps,libs
sonar.tests=apps,libs
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts

# Exclusions
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.d.ts,**/prisma/migrations/**,**/locales/**,**/vite-config.ts,**/en.ts,**/cy.ts,**/mock-*.ts

# Coverage
sonar.typescript.lcov.reportPaths=lcov.info

# Duplication exclusions
sonar.cpd.exclusions=apps/web/src/pages/**,libs/**/src/pages/**
```

#### 3. OSV Scanner Configuration

**Security Workflow** (`.github/workflows/osv-scanner.yml`):
```yaml
name: Security

on:
  pull_request:
  push:
    branches: [master, main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  scan:
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@v2.3.0
    with:
      scan-args: |-
        --config=.github/osv-scanner.toml
        ./
```

### Project-Specific Examples

#### Test Coverage in libs/auth

```typescript
// libs/auth/src/middleware/authenticate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from './authenticate.js';

describe('authenticate middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = { isAuthenticated: vi.fn() } as unknown as Request;
    res = {
      redirect: vi.fn(),
      render: vi.fn()
    } as unknown as Response;
    next = vi.fn();
  });

  it('should call next when user is authenticated', async () => {
    req.isAuthenticated = vi.fn().mockReturnValue(true);

    const middleware = authenticate();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', async () => {
    req.isAuthenticated = vi.fn().mockReturnValue(false);

    const middleware = authenticate();
    await middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
```

#### Security Middleware in libs/web-core

```typescript
// libs/web-core/src/middleware/helmet/helmet-middleware.ts
import helmet from 'helmet';

export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
}
```

#### Database Query Patterns

```typescript
// apps/postgres/prisma/schema.prisma
model Court {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("court")
}

// libs/location/src/repository/service.ts (Parameterized queries)
export async function findCourtById(id: string) {
  // Prisma automatically parameterizes this query
  return prisma.court.findUnique({
    where: { id }
  });
}

export async function searchCourts(name: string) {
  // Safe parameterization for search
  return prisma.court.findMany({
    where: {
      name: {
        contains: name,
        mode: 'insensitive'
      }
    }
  });
}
```

---

## Success Criteria: What Good Looks Like

### Quality Gates

These are the standards every VIBE pilot project must meet:

| Metric | Minimum Standard | Target | VIBE Pilot Goal |
|--------|------------------|--------|-----------------|
| **Test Coverage** | 70% overall | 80% business logic | 85% by Q2 2025 |
| **CVEs (Critical)** | 0 | 0 | 0 |
| **CVEs (High)** | ≤2 with mitigation plan | 0 | 0 |
| **CVEs (Medium/Low)** | Plan for remediation | Fix in next sprint | Fix in next sprint |
| **Duplicated Lines** | <5% | <3% | <3% |
| **Maintainability Rating** | B or higher | A | A |
| **Reliability Rating** | B or higher | A | A |
| **Security Rating** | B or higher | A | A |

### Quality Gate Enforcement

**On Pull Requests**:
- Tests must pass (100% passing)
- Coverage must not decrease
- No new Critical or High CVEs
- No new security vulnerabilities
- No new blocker issues

**Before Merging to Main**:
- All quality gates must pass
- SonarQube analysis complete
- Team review approved

**Monthly Quality Reviews**:
- Review quality trends
- Address technical debt backlog
- Update quality targets
- Celebrate improvements

### Continuous Improvement

**Quarterly Metric Baseline Updates**:
- Review current metrics against targets
- Set new stretch goals
- Identify areas for improvement
- Update team training needs

**Integration with PR Review Process**:
1. Developer creates PR
2. CI runs tests and quality analysis
3. SonarQube comments on PR with results
4. Reviewer checks code quality alongside functionality
5. PR only merged if quality gates pass

**Automated Quality Gate Enforcement**:
```yaml
# Branch protection rules on GitHub
branches:
  master:
    required_status_checks:
      - test
      - lint
      - sonarqube
      - security-scan
```

---

## Developer Workflow Integration

### Local Quality Checks

Before committing code, run these quality checks:

```bash
# Fix linting issues
yarn lint:fix

# Run tests with coverage
yarn test:coverage

# View coverage report in browser
open coverage/index.html

# Ensure database migrations are clean
yarn db:migrate:dev
```

### Pre-Commit Checklist

- [ ] All tests passing (`yarn test`)
- [ ] Test coverage adequate for new code
- [ ] No linting errors (`yarn lint`)
- [ ] Code formatted (`yarn format`)
- [ ] No hardcoded secrets or credentials
- [ ] Input validation added for user inputs
- [ ] Error handling added for async operations
- [ ] Welsh translations added (if user-facing)

### PR Quality Gate Requirements

Every pull request must meet these requirements:

**Automated Checks**:
- ✅ All tests passing
- ✅ Test coverage ≥80% for new code
- ✅ No new Critical/High CVEs
- ✅ No new security vulnerabilities
- ✅ No increase in duplicated code
- ✅ Maintainability rating ≥B

**Manual Review**:
- Code follows CLAUDE.md guidelines
- Security considerations documented
- Error handling appropriate
- Tests cover edge cases

### Viewing Quality Reports Locally

**Coverage Report**:
```bash
# Generate coverage report
yarn test:coverage

# Open in browser
open coverage/index.html
```

The coverage report shows:
- Overall coverage percentage
- Coverage by file
- Lines not covered (highlighted in red)
- Branch coverage

**SonarQube Preview** (requires SonarQube token):
```bash
# Analyze locally
sonar-scanner \
  -Dsonar.projectKey=hmcts.cath \
  -Dsonar.sources=apps,libs \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=$SONAR_TOKEN
```

### Interpreting SonarQube Feedback in PRs

SonarQube automatically comments on PRs with:

**Quality Gate Status**:
```
✅ Quality Gate passed

Coverage: 85.3% (+2.1%)
Duplicated Lines: 2.8% (no change)
Maintainability: A (no change)
Reliability: A (no change)
Security: A (no change)
```

**New Issues**:
```
⚠️ 2 new issues

Maintainability:
- src/user-service.ts:45 - Cognitive Complexity of 15 (threshold is 10)

Security:
- src/upload.ts:23 - File upload without validation (Security Hotspot)
```

**How to Respond**:
1. Click the issue link to view details in SonarQube
2. Review the suggested fix
3. Apply the fix in your PR
4. Push changes and wait for re-analysis

### Fixing Common Quality Issues

#### Issue: Low Test Coverage

**Problem**: Coverage is below 80%

**Solution**:
```bash
# Identify uncovered code
yarn test:coverage
open coverage/index.html

# Add tests for uncovered lines
vim src/user-service.test.ts

# Verify coverage improved
yarn test:coverage
```

#### Issue: Code Duplication

**Problem**: SonarQube reports duplicated code

**Solution**:
1. Review the duplicated blocks in SonarQube UI
2. Identify the common pattern
3. Extract to a shared function or utility
4. Update tests to cover the new shared function

#### Issue: Security Hotspot

**Problem**: SonarQube flags a security hotspot

**Solution**:
1. Review the security concern
2. Add appropriate validation or sanitization
3. Document why the code is safe (if it is)
4. Request security review if unsure

Example:
```typescript
// Before (Security Hotspot)
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  // Direct use of user input
});

// After (Fixed)
app.get('/user/:id', (req, res) => {
  const userId = z.string().uuid().parse(req.params.id);
  // Validated UUID
});
```

#### Issue: Code Smell (Cognitive Complexity)

**Problem**: Function is too complex

**Solution**:
1. Break function into smaller functions
2. Extract conditional logic to named functions
3. Reduce nesting levels

Example:
```typescript
// Before (Cognitive Complexity: 15)
function processOrder(order, user) {
  if (order) {
    if (order.items.length > 0) {
      if (user && user.verified) {
        // ... complex logic
      }
    }
  }
}

// After (Cognitive Complexity: 5)
function processOrder(order: Order, user: User) {
  validateOrderAndUser(order, user);
  return applyDiscounts(calculateTotal(order.items));
}

function validateOrderAndUser(order: Order, user: User) {
  if (!order || order.items.length === 0) {
    throw new Error('Invalid order');
  }
  if (!user?.verified) {
    throw new Error('User not verified');
  }
}
```

---

## Troubleshooting and FAQ

### Common Questions

#### Q: Why is my coverage percentage lower in CI than locally?

**A**: This usually happens because:

1. **Different test execution**: CI might run a subset of tests
2. **Cached coverage**: Local coverage report might be stale
3. **Excluded files**: CI might exclude more files

**Solution**:
```bash
# Clear coverage cache locally
rm -rf coverage/

# Run tests exactly as CI does
npx turbo test -- --coverage

# Compare with CI coverage report
```

#### Q: How do I exclude generated code from analysis?

**A**: Add exclusions to `sonar-project.properties`:

```properties
sonar.exclusions=**/node_modules/**,**/dist/**,**/prisma/migrations/**
```

For coverage exclusions in Vitest:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/prisma/migrations/**'
      ]
    }
  }
});
```

#### Q: What's the difference between a code smell and a bug?

**A**:

| Type | Definition | Impact | Example |
|------|-----------|--------|---------|
| **Bug** | Code that will cause incorrect behavior | Breaks functionality | Null pointer exception |
| **Code Smell** | Code that makes maintenance harder | Makes future changes harder | Overly complex function |
| **Vulnerability** | Code that creates a security risk | Enables attacks | SQL injection |

**Code smells** don't break the code *now*, but make it harder to maintain *later*.

#### Q: How do I request an exception for a security hotspot?

**A**: If you believe a security hotspot is a false positive:

1. Review the security concern thoroughly
2. Document why the code is safe
3. Add a comment explaining the mitigation
4. Request review from a security champion

Example:
```typescript
// Security hotspot: eval() usage
// SECURITY REVIEW: This eval() is safe because:
// 1. Input is validated against a whitelist of allowed expressions
// 2. Execution is sandboxed with limited context
// 3. No user input is directly evaluated
// Reviewed by: @security-champion on 2025-11-24
const result = safeEval(validatedExpression, sandboxedContext);
```

#### Q: Why are page templates excluded from duplication checks?

**A**: Page templates (controller files in `src/pages/`) follow a consistent pattern:

```typescript
export const GET = async (req, res) => { /* ... */ };
export const POST = async (req, res) => { /* ... */ };
```

This repetitive structure is:
- Expected and idiomatic for Express
- Improves consistency across pages
- More readable than abstracted alternatives
- Not actual "duplication" in the maintenance sense

However, if you have **business logic** duplication in page controllers, extract it to a service layer.

#### Q: How do I fix a failing quality gate?

**A**:

1. **Check the SonarQube PR comment** to see which gate failed
2. **Address the specific issue**:
   - Low coverage: Add tests
   - New bug: Fix the bug
   - New vulnerability: Fix the security issue
   - Duplicated code: Refactor
3. **Push changes** and wait for re-analysis
4. **Verify the gate passes**

If you believe the gate is incorrectly failing, discuss with your team lead.

#### Q: Can I merge a PR with a failing quality gate?

**A**: Generally, no. Quality gates are enforced for good reasons:

- **Critical/High CVEs**: Must be fixed before merge
- **Security vulnerabilities**: Must be fixed before merge
- **Test failures**: Must be fixed before merge
- **Coverage decrease**: Should be justified and minimal

In exceptional circumstances (e.g., hotfix for production incident), gates can be overridden with approval from:
- Team lead
- Security review (for security issues)
- Technical architect (for architectural concerns)

#### Q: How often should I check SonarQube?

**A**:

- **Before creating PR**: Run quality checks locally
- **During PR review**: Check SonarQube comments
- **After merge**: Monitor overall project quality
- **Monthly**: Review quality trends and technical debt

---

## Further Reading

### Quality Metrics and Standards

- **[SonarQube Metric Definitions](https://docs.sonarsource.com/sonarqube/latest/user-guide/metric-definitions/)** - Official definitions of all SonarQube metrics
- **[SonarQube Quality Gates](https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates/)** - How quality gates work
- **[Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)** - Test coverage configuration and best practices

### Security Standards

- **[OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)** - Most critical web application security risks
- **[OWASP API Security Top 10](https://owasp.org/www-project-api-security/)** - API-specific security risks
- **[CWE Top 25](https://cwe.mitre.org/top25/)** - Most dangerous software weaknesses
- **[SANS Top 25](https://www.sans.org/top25-software-errors/)** - Most common programming errors

### Government Standards

- **[GOV.UK Service Manual](https://www.gov.uk/service-manual)** - Standards for building government services
- **[GDS Service Standard](https://www.gov.uk/service-manual/service-standard)** - 14-point standard for digital services
- **[Technology Code of Practice](https://www.gov.uk/guidance/the-technology-code-of-practice)** - Technology best practices for government

### HMCTS Standards

- **[CLAUDE.md](../../CLAUDE.md)** - HMCTS Express monorepo development guidelines
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** - VIBE pilot architecture documentation
- **[Security Standards](https://hmcts.github.io/)** - HMCTS security guidelines

### Tools and Resources

- **[OSV Scanner](https://google.github.io/osv-scanner/)** - Open Source Vulnerability scanner
- **[Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)** - Prisma security best practices
- **[Helmet.js](https://helmetjs.github.io/)** - Express security middleware
- **[GDPR Compliance](https://ico.org.uk/for-organisations/guide-to-data-protection/)** - UK GDPR guidance

---

## Maintenance and Updates

This document should be reviewed and updated:

- **Quarterly**: Review metrics, targets, and examples
- **When tools change**: Update configuration examples
- **When standards evolve**: Update best practices
- **After team retrospectives**: Incorporate feedback

**Document Owner**: HMCTS VIBE Pilot Team
**Next Review Date**: February 2026

---

## Feedback and Contributions

This document is a living guide. If you find:
- Outdated information
- Unclear explanations
- Missing topics
- Errors or inaccuracies

Please submit a PR with suggested improvements or raise an issue.

---

*This document is part of the VIBE pilot's commitment to maintaining high-quality, secure, and maintainable code for HMCTS digital services.*
