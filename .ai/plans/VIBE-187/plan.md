# VIBE-187: Technical Implementation Plan

## Architecture Overview

This feature will be implemented as a new module `@hmcts/educational-feedback` following HMCTS monorepo patterns. The module will provide both user-facing feedback forms and admin functionality.

### Module Structure

```
libs/educational-feedback/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma                    # Feedback data model
└── src/
    ├── config.ts                        # Module configuration exports
    ├── index.ts                         # Business logic exports
    ├── pages/                           # User-facing pages
    │   ├── feedback/
    │   │   ├── index.ts                 # Feedback form controller (GET/POST)
    │   │   ├── index.njk                # Feedback form template
    │   │   ├── en.ts                    # English translations
    │   │   └── cy.ts                    # Welsh translations
    │   ├── feedback-success/
    │   │   ├── index.ts                 # Success page controller
    │   │   ├── index.njk                # Success page template
    │   │   ├── en.ts                    # English translations
    │   │   └── cy.ts                    # Welsh translations
    ├── admin-pages/                     # Admin functionality
    │   ├── feedback-dashboard/
    │   │   ├── index.ts                 # Dashboard controller
    │   │   ├── index.njk                # Dashboard template
    │   │   ├── en.ts                    # English translations
    │   │   └── cy.ts                    # Welsh translations
    │   └── feedback-export/
    │       └── index.ts                 # CSV export controller
    ├── routes/                          # API routes
    │   └── feedback.ts                  # Feedback submission API
    ├── feedback/
    │   ├── feedback-service.ts          # Business logic
    │   ├── feedback-service.test.ts     # Service tests
    │   ├── feedback-queries.ts          # Database queries
    │   ├── feedback-queries.test.ts     # Query tests
    │   ├── feedback-validation.ts       # Input validation
    │   └── feedback-validation.test.ts  # Validation tests
    └── assets/
        └── css/
            └── feedback.scss            # Module-specific styles
```

## Database Design

### Prisma Schema

```prisma
// libs/educational-feedback/prisma/schema.prisma

model EducationalFeedback {
  id                  String   @id @default(uuid()) @db.Uuid
  artefactId          String   @map("artefact_id") @db.Uuid
  satisfactionRating  Int      @map("satisfaction_rating")
  trustRating         Int      @map("trust_rating")
  comment             String?  @db.Text
  submittedAt         DateTime @default(now()) @map("submitted_at")

  @@index([artefactId])
  @@index([submittedAt])
  @@map("educational_feedback")
}
```

### Migration Strategy

1. Create new migration in `apps/postgres/prisma/migrations/`
2. Schema discovery will automatically include the new schema from `libs/educational-feedback/prisma/schema.prisma`
3. Run `yarn db:migrate:dev` to apply migration

## Component Design

### 1. Feedback Form (User-Facing)

**Route:** `/feedback?artefactId={uuid}`

**Features:**
- Query parameter validation for artefactId
- Progressive enhancement with JavaScript
- GOV.UK radios component for ratings
- GOV.UK textarea with character count
- Form validation (client and server-side)
- CSRF protection
- Rate limiting middleware

**Controller Logic:**
```typescript
// GET: Display form with pre-filled artefact context
// POST: Validate and submit feedback, redirect to success page
```

**Validation Rules:**
- artefactId: required, valid UUID, exists in database
- satisfactionRating: required, integer 1-5
- trustRating: required, integer 1-5
- comment: optional, max 1000 characters, sanitized

### 2. Success Page

**Route:** `/feedback-success`

**Features:**
- Thank you message
- No sensitive data displayed
- Link back to publications
- Prevents form resubmission

### 3. Admin Dashboard

**Route:** `/admin/feedback-dashboard`

**Access Control:**
- Requires system admin authentication
- Uses existing SSO middleware from `@hmcts/auth`

**Features:**
- Summary statistics cards:
  - Total feedback count
  - Average satisfaction (with trend)
  - Average trust (with trend)
  - Recent feedback count (last 30 days)
- Filters:
  - Date range picker (GOV.UK date input)
  - Publication filter (dropdown)
- Data table with pagination:
  - Publication name
  - Satisfaction rating (stars visualization)
  - Trust rating (stars visualization)
  - Comment preview
  - Submission date
  - View details link
- Export button (generates CSV)

### 4. CSV Export

**Route:** `/admin/feedback-export`

**Access Control:**
- Requires system admin authentication

**Features:**
- Respects dashboard filters
- Generates CSV with headers
- Streaming response for large datasets
- Filename includes date range

**CSV Columns:**
- Submission Date
- Publication ID
- Publication Name
- Satisfaction Rating
- Trust Rating
- Comment

## Integration Points

### 1. Publication Pages Integration

Add feedback form link to publication detail pages:

**Location:** `libs/publication/src/pages/publication-detail/index.njk`

```html
<!-- At bottom of publication content -->
<div class="govuk-!-margin-top-8">
  <h2 class="govuk-heading-m">{{ feedbackHeading }}</h2>
  <p class="govuk-body">{{ feedbackDescription }}</p>
  <a href="/feedback?artefactId={{ publicationId }}" class="govuk-button govuk-button--secondary">
    {{ provideFeedbackButton }}
  </a>
</div>
```

### 2. Admin Navigation Integration

Add link to admin navigation:

**Location:** `libs/admin-pages/src/views/partials/navigation.njk`

```html
<li class="govuk-header__navigation-item">
  <a class="govuk-header__link" href="/admin/feedback-dashboard">
    {{ feedbackMenuItem }}
  </a>
</li>
```

### 3. Rate Limiting Middleware

Create reusable middleware for spam prevention:

```typescript
// libs/educational-feedback/src/rate-limit-middleware.ts
import type { Request, Response, NextFunction } from 'express';

const RATE_LIMIT = 10; // submissions per hour
const submissions = new Map<string, number[]>();

export function rateLimitFeedback() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Get recent submissions for this IP
    const recent = (submissions.get(ip) || []).filter(time => time > hourAgo);

    if (recent.length >= RATE_LIMIT) {
      return res.status(429).render('errors/429', {
        en: { message: 'Too many submissions. Please try again later.' },
        cy: { message: 'Gormod o gyflwyniadau. Ceisiwch eto yn nes ymlaen.' }
      });
    }

    recent.push(now);
    submissions.set(ip, recent);
    next();
  };
}
```

## Service Layer Design

### Feedback Service

**Responsibilities:**
- Business logic for feedback submission
- Data validation
- Metrics calculation
- Comment sanitization

```typescript
// libs/educational-feedback/src/feedback/feedback-service.ts

export async function submitFeedback(data: FeedbackSubmission): Promise<EducationalFeedback> {
  validateFeedbackData(data);
  const sanitizedComment = sanitizeComment(data.comment);
  return createFeedback({
    ...data,
    comment: sanitizedComment
  });
}

export async function getFeedbackMetrics(filters: FeedbackFilters): Promise<FeedbackMetrics> {
  const feedback = await queryFeedbackWithFilters(filters);
  return calculateMetrics(feedback);
}

export async function exportFeedbackToCsv(filters: FeedbackFilters): Promise<string> {
  const feedback = await queryFeedbackWithFilters(filters);
  return generateCsvContent(feedback);
}
```

### Data Access Layer

```typescript
// libs/educational-feedback/src/feedback/feedback-queries.ts

export async function createFeedback(data: CreateFeedbackData) {
  return prisma.educationalFeedback.create({ data });
}

export async function queryFeedbackWithFilters(filters: FeedbackFilters) {
  return prisma.educationalFeedback.findMany({
    where: buildWhereClause(filters),
    orderBy: { submittedAt: 'desc' }
  });
}

export async function getFeedbackStats(filters: FeedbackFilters) {
  return prisma.educationalFeedback.aggregate({
    where: buildWhereClause(filters),
    _avg: {
      satisfactionRating: true,
      trustRating: true
    },
    _count: true
  });
}
```

## Security Considerations

### 1. Input Validation
- All user input validated with strict schemas
- Comment text sanitized to prevent XSS
- artefactId validated as UUID and checked against database

### 2. Rate Limiting
- IP-based rate limiting (10 submissions per hour)
- Stored in Redis for distributed systems
- Cleared after 1 hour

### 3. CSRF Protection
- Use existing CSRF middleware from web-core
- Tokens generated per session
- Validated on all POST requests

### 4. SQL Injection Prevention
- Prisma ORM with parameterized queries
- No raw SQL queries
- Input validation before database operations

### 5. Authorization
- Admin endpoints protected by SSO middleware
- Role-based access control (system admin only)
- No public access to feedback data

## Performance Optimization

### 1. Database Indexes
- Index on `artefact_id` for filtering by publication
- Index on `submitted_at` for date range queries
- Composite index on `(artefact_id, submitted_at)` for combined queries

### 2. Pagination
- Admin dashboard uses cursor-based pagination
- Limit results to 50 per page
- Prevents loading entire dataset

### 3. Caching
- Cache aggregate statistics for 5 minutes
- Redis cache for frequently accessed data
- Invalidate cache on new submissions

### 4. CSV Export
- Stream data instead of loading all into memory
- Process in chunks of 1000 records
- Background job for large exports (future enhancement)

## Testing Strategy

### Unit Tests
- Service layer tests (feedback-service.test.ts)
- Query layer tests (feedback-queries.test.ts)
- Validation tests (feedback-validation.test.ts)
- Coverage target: >80%

### E2E Tests
```typescript
// e2e-tests/tests/feedback.spec.ts

test('user can submit feedback', async ({ page }) => {
  await page.goto('/feedback?artefactId=valid-uuid');
  await page.check('[name="satisfactionRating"][value="5"]');
  await page.check('[name="trustRating"][value="4"]');
  await page.fill('[name="comment"]', 'Very helpful material');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/feedback-success');
});

test('admin can view feedback dashboard', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page);
  await page.goto('/admin/feedback-dashboard');
  await expect(page.locator('h1')).toContainText('Feedback Dashboard');
  await expect(page.locator('.feedback-stats')).toBeVisible();
});
```

### Accessibility Tests
- Axe-core integration with Playwright
- Test all pages with screen reader simulation
- Keyboard navigation testing
- Color contrast verification

## Deployment Considerations

### Database Migration
1. Create migration file
2. Test in development environment
3. Apply to demo environment
4. Apply to test environment
5. Apply to staging environment
6. Apply to production environment

### Feature Flag
- Consider feature flag for gradual rollout
- Enable for specific user groups first
- Monitor error rates and performance
- Full rollout after validation

### Monitoring
- Track submission success rate
- Monitor response times
- Alert on high error rates
- Track rate limit hits

## Rollout Plan

### Phase 1: Development (Week 1-2)
1. Create module structure
2. Implement database schema
3. Build feedback service and queries
4. Create feedback form pages
5. Unit test coverage

### Phase 2: Admin Dashboard (Week 3)
1. Build dashboard page
2. Implement metrics calculation
3. Add CSV export functionality
4. E2E tests

### Phase 3: Integration (Week 4)
1. Integrate with publication pages
2. Add to admin navigation
3. Accessibility testing
4. Documentation

### Phase 4: Testing & QA (Week 5)
1. Full E2E test suite
2. Accessibility audit
3. Performance testing
4. Security review

### Phase 5: Deployment (Week 6)
1. Deploy to demo environment
2. Internal testing
3. Deploy to test environment
4. UAT
5. Deploy to production

## Dependencies

### Required Packages
- No new external dependencies required
- Uses existing stack:
  - express 5.1.0
  - @hmcts/postgres (Prisma)
  - @hmcts/web-core (GOV.UK components)
  - @hmcts/auth (SSO)

### Module Dependencies
```json
{
  "dependencies": {
    "@hmcts/postgres": "workspace:*",
    "@hmcts/web-core": "workspace:*",
    "@hmcts/auth": "workspace:*",
    "@hmcts/publication": "workspace:*"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

## Alternative Approaches Considered

### 1. Third-Party Survey Tool
**Rejected:** Would create external dependency, data sovereignty concerns, additional cost, harder to integrate with existing auth system.

### 2. Real-time Analytics Dashboard
**Deferred:** Added complexity, not required for MVP. Can be added as future enhancement.

### 3. Machine Learning Sentiment Analysis
**Deferred:** Over-engineering for current needs. Manual review sufficient for initial launch.

### 4. Microservice Architecture
**Rejected:** Monorepo pattern is established standard. Microservices would add unnecessary complexity for this feature size.

## Future Enhancements

1. Email notifications for low satisfaction scores
2. Trend analysis and visualization
3. Sentiment analysis on comments
4. Feedback comparison across publication types
5. Public aggregate statistics page
6. Integration with Google Analytics
7. A/B testing for form variations
8. Automated report generation
