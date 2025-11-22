# VIBE-99: KPI04 Evidential Pack - Technical Implementation Plan

## Overview

This plan outlines the technical implementation of the KPI04 evidential pack system for managing academic research, market benchmarking, and governance metrics for CATH's AI governance framework.

## Architecture Overview

### Module Structure

```
libs/evidence-pack/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma              # Evidence pack database schema
└── src/
    ├── config.ts                  # Module configuration exports
    ├── index.ts                   # Business logic exports
    ├── pages/                     # Admin UI pages
    │   ├── evidence/
    │   │   ├── dashboard.ts       # GET /evidence/dashboard
    │   │   ├── dashboard.njk
    │   │   ├── research/
    │   │   │   ├── list.ts        # GET /evidence/research/list
    │   │   │   ├── list.njk
    │   │   │   ├── add.ts         # GET/POST /evidence/research/add
    │   │   │   ├── add.njk
    │   │   │   ├── [id].ts        # GET /evidence/research/[id]
    │   │   │   └── [id].njk
    │   │   ├── benchmarks/
    │   │   │   ├── list.ts        # GET /evidence/benchmarks/list
    │   │   │   ├── list.njk
    │   │   │   ├── add.ts         # GET/POST /evidence/benchmarks/add
    │   │   │   ├── add.njk
    │   │   │   ├── [id].ts        # GET /evidence/benchmarks/[id]
    │   │   │   └── [id].njk
    │   │   ├── items/
    │   │   │   ├── list.ts        # GET /evidence/items/list
    │   │   │   ├── list.njk
    │   │   │   ├── add.ts         # GET/POST /evidence/items/add
    │   │   │   ├── add.njk
    │   │   │   ├── [id].ts        # GET /evidence/items/[id]
    │   │   │   └── [id].njk
    │   │   ├── metrics/
    │   │   │   ├── list.ts        # GET /evidence/metrics/list
    │   │   │   ├── list.njk
    │   │   │   ├── [id].ts        # GET /evidence/metrics/[id]
    │   │   │   ├── [id].njk
    │   │   │   ├── record.ts      # POST /evidence/metrics/record
    │   │   │   └── record.njk
    │   │   └── reports/
    │   │       ├── list.ts        # GET /evidence/reports/list
    │   │       ├── list.njk
    │   │       ├── generate.ts    # GET/POST /evidence/reports/generate
    │   │       ├── generate.njk
    │   │       └── [id].ts        # GET /evidence/reports/[id]
    │   └── locales/
    │       ├── en.ts              # English translations
    │       └── cy.ts              # Welsh translations
    ├── routes/                    # API endpoints
    │   └── evidence/
    │       ├── search.ts          # POST /api/evidence/search
    │       └── export.ts          # GET /api/evidence/export/[id]
    ├── evidence-pack/             # Business logic domain
    │   ├── research-service.ts    # Research source management
    │   ├── research-queries.ts    # Research database queries
    │   ├── benchmark-service.ts   # Benchmark management
    │   ├── benchmark-queries.ts   # Benchmark database queries
    │   ├── evidence-service.ts    # Evidence item management
    │   ├── evidence-queries.ts    # Evidence database queries
    │   ├── metrics-service.ts     # KPI04 metrics tracking
    │   ├── metrics-queries.ts     # Metrics database queries
    │   ├── report-service.ts      # Evidence pack generation
    │   ├── report-queries.ts      # Report database queries
    │   ├── search-service.ts      # Search functionality
    │   ├── validation.ts          # Zod validation schemas
    │   └── models.ts              # TypeScript types
    └── assets/
        ├── css/
        │   └── evidence-pack.scss # Module-specific styles
        └── js/
            └── evidence-search.ts  # Search interface enhancements
```

## Database Schema Design

### Prisma Schema

```prisma
// libs/evidence-pack/prisma/schema.prisma

// Research sources (academic papers, industry reports, etc.)
model ResearchSource {
  id              String   @id @default(cuid())
  sourceType      String   @map("source_type") // academic, industry_report, government_guidance
  title           String
  authors         String
  publicationDate DateTime @map("publication_date")
  citation        String   @db.Text
  url             String?
  doi             String?
  summary         String   @db.Text
  keyFindings     String   @map("key_findings") @db.Text
  relevance       String   @db.Text
  tags            String[] // Array of governance domain tags
  addedBy         String   @map("added_by")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("research_source")
  @@index([sourceType])
  @@index([publicationDate])
  @@index([tags])
}

// Benchmark standards (ISO, NIST, IEEE, etc.)
model BenchmarkStandard {
  id                String   @id @default(cuid())
  standardName      String   @map("standard_name")
  organization      String
  version           String
  publicationDate   DateTime @map("publication_date")
  description       String   @db.Text
  url               String?

  requirements      BenchmarkRequirement[]
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("benchmark_standard")
  @@index([standardName])
}

// Individual requirements within benchmark standards
model BenchmarkRequirement {
  id                String   @id @default(cuid())
  standardId        String   @map("standard_id")
  requirementNumber String   @map("requirement_number")
  requirementText   String   @map("requirement_text") @db.Text
  alignmentStatus   String   @map("alignment_status") // aligned, partial, gap, not_applicable
  cathApproach      String   @map("cath_approach") @db.Text
  evidenceMapping   String[] @map("evidence_mapping") // Array of evidence item IDs
  gapNotes          String?  @map("gap_notes") @db.Text

  standard          BenchmarkStandard @relation(fields: [standardId], references: [id], onDelete: Cascade)

  @@map("benchmark_requirement")
  @@index([standardId])
  @@index([alignmentStatus])
}

// Evidence items (policies, processes, audits, measurements)
model EvidenceItem {
  id                  String   @id @default(cuid())
  evidenceType        String   @map("evidence_type") // policy, process, audit, measurement, document
  title               String
  description         String   @db.Text
  governanceControl   String   @map("governance_control")
  collectionDate      DateTime @map("collection_date")
  verificationStatus  String   @map("verification_status") // draft, verified, approved
  verifiedBy          String?  @map("verified_by")
  verifiedAt          DateTime? @map("verified_at")
  filePath            String?  @map("file_path") // Path to supporting document
  tags                String[]
  relatedMetrics      String[] @map("related_metrics") // Array of metric IDs
  addedBy             String   @map("added_by")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@map("evidence_item")
  @@index([evidenceType])
  @@index([governanceControl])
  @@index([verificationStatus])
  @@index([tags])
}

// KPI04 metrics
model Kpi04Metric {
  id                    String   @id @default(cuid())
  metricName            String   @map("metric_name")
  description           String   @db.Text
  measurementMethodology String  @map("measurement_methodology") @db.Text
  baselineValue         Float?   @map("baseline_value")
  baselineDate          DateTime? @map("baseline_date")
  targetValue           Float?   @map("target_value")
  measurementFrequency  String   @map("measurement_frequency") // daily, weekly, monthly, quarterly
  unit                  String
  category              String   // effectiveness, compliance, risk_mitigation, oversight

  measurements          MetricMeasurement[]
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("kpi04_metric")
  @@index([metricName])
  @@index([category])
}

// Individual metric measurements
model MetricMeasurement {
  id              String   @id @default(cuid())
  metricId        String   @map("metric_id")
  measurementDate DateTime @map("measurement_date")
  value           Float
  notes           String?  @db.Text
  evidenceIds     String[] @map("evidence_ids") // Supporting evidence
  recordedBy      String   @map("recorded_by")
  createdAt       DateTime @default(now()) @map("created_at")

  metric          Kpi04Metric @relation(fields: [metricId], references: [id], onDelete: Cascade)

  @@map("metric_measurement")
  @@index([metricId, measurementDate])
}

// Evidence pack versions
model EvidencePackVersion {
  id                String   @id @default(cuid())
  versionNumber     String   @map("version_number")
  publicationDate   DateTime @map("publication_date")
  summaryOfChanges  String   @map("summary_of_changes") @db.Text
  compiledBy        String   @map("compiled_by")
  reviewStatus      String   @map("review_status") // draft, in_review, approved, published
  reviewedBy        String?  @map("reviewed_by")
  reviewedAt        DateTime? @map("reviewed_at")
  distributionList  String[] @map("distribution_list")
  filePath          String?  @map("file_path") // Path to generated PDF

  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("evidence_pack_version")
  @@index([versionNumber])
  @@index([publicationDate])
  @@index([reviewStatus])
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### Tasks:
1. **Module Setup**
   - Create `libs/evidence-pack` directory structure
   - Initialize `package.json` with proper exports
   - Configure `tsconfig.json`
   - Add module to root `tsconfig.json` paths
   - Register module in `apps/web/src/app.ts`

2. **Database Schema**
   - Create Prisma schema in `libs/evidence-pack/prisma/schema.prisma`
   - Add schema to `apps/postgres/src/schema-discovery.ts`
   - Generate and run migrations
   - Generate Prisma client

3. **Authentication & Authorization**
   - Create authorization middleware for evidence pack routes
   - Define role permissions (System Admin, Governance Lead, Auditor)
   - Add role checks to sensitive operations

4. **Base Services and Queries**
   - Create base service pattern
   - Implement error handling
   - Set up query utilities
   - Add logging and audit trail

**Deliverables:**
- Module structure complete
- Database schema deployed
- Authentication working
- Base patterns established

### Phase 2: Research Management (Week 3-4)

#### Tasks:
1. **Research Source Data Layer**
   - Implement `research-queries.ts` for CRUD operations
   - Add full-text search for research sources
   - Implement tag-based filtering

2. **Research Source Service**
   - Create `research-service.ts` with business logic
   - Add validation with Zod schemas
   - Implement citation formatting
   - Add duplicate detection

3. **Research Source UI**
   - Create research list page with filtering
   - Implement add research source form
   - Build research source detail view
   - Add edit and delete functionality

4. **Content and Translations**
   - Define English content in `locales/en.ts`
   - Translate to Welsh in `locales/cy.ts`
   - Follow GOV.UK content patterns

**Deliverables:**
- Research sources manageable via UI
- Search and filtering functional
- Content fully bilingual
- Tests passing

### Phase 3: Benchmark Management (Week 4-5)

#### Tasks:
1. **Benchmark Data Layer**
   - Implement `benchmark-queries.ts`
   - Handle nested requirements
   - Add alignment status tracking

2. **Benchmark Service**
   - Create `benchmark-service.ts`
   - Implement requirement management
   - Add gap analysis logic
   - Calculate alignment percentages

3. **Benchmark UI**
   - Create benchmark list page
   - Implement benchmark detail with requirements
   - Build alignment status editor
   - Add gap analysis view

4. **Evidence Mapping**
   - Link benchmarks to evidence items
   - Show requirement coverage
   - Identify missing evidence

**Deliverables:**
- Benchmark standards tracked
- Requirements manageable
- Alignment status visible
- Gap analysis available

### Phase 4: Evidence Collection (Week 5-6)

#### Tasks:
1. **Evidence Data Layer**
   - Implement `evidence-queries.ts`
   - Add file attachment handling
   - Implement verification workflow

2. **Evidence Service**
   - Create `evidence-service.ts`
   - Add file upload/storage
   - Implement verification logic
   - Add tagging and categorization

3. **Evidence UI**
   - Create evidence list with filters
   - Implement add evidence form
   - Build evidence detail view
   - Add verification workflow UI

4. **File Management**
   - Implement secure file upload
   - Add file storage (cloud or local)
   - Implement file download
   - Add virus scanning (if required)

**Deliverables:**
- Evidence items stored
- Files attached securely
- Verification workflow working
- UI complete and tested

### Phase 5: Metrics Framework (Week 6-7)

#### Tasks:
1. **Metrics Data Layer**
   - Implement `metrics-queries.ts`
   - Add time-series queries
   - Calculate trends and statistics

2. **Metrics Service**
   - Create `metrics-service.ts`
   - Implement measurement recording
   - Add trend analysis
   - Calculate achievement vs targets

3. **Metrics UI**
   - Create metrics dashboard
   - Build measurement recording form
   - Add metric detail view with charts
   - Implement trend visualization

4. **Analytics**
   - Add statistical calculations
   - Implement trend detection
   - Generate insights
   - Add alerts for off-target metrics

**Deliverables:**
- KPI04 metrics defined
- Measurements recordable
- Trends visible
- Dashboard functional

### Phase 6: Reporting (Week 7-8)

#### Tasks:
1. **Report Data Layer**
   - Implement `report-queries.ts`
   - Aggregate data from all sources
   - Implement version management

2. **Report Service**
   - Create `report-service.ts`
   - Implement evidence pack generation
   - Add PDF formatting
   - Generate executive summaries

3. **Report UI**
   - Create report list page
   - Build report generation form
   - Add report preview
   - Implement distribution workflow

4. **Export Functionality**
   - Generate PDF reports
   - Create Word document option
   - Add CSV export for data
   - Implement secure distribution

**Deliverables:**
- Evidence packs generatable
- Multiple format options
- Version control working
- Distribution trackable

### Phase 7: Search & Polish (Week 9-10)

#### Tasks:
1. **Search Functionality**
   - Implement unified search across all content
   - Add advanced filtering
   - Implement saved searches
   - Add search API endpoint

2. **User Experience Enhancements**
   - Add bulk operations
   - Implement batch imports
   - Add quick actions
   - Improve navigation

3. **Performance Optimization**
   - Add database indexes
   - Implement caching where appropriate
   - Optimize queries
   - Add pagination

4. **Testing & Documentation**
   - Complete unit tests
   - Add E2E tests with Playwright
   - Write user documentation
   - Create admin guide

**Deliverables:**
- Search fully functional
- Performance optimized
- Comprehensive tests
- Documentation complete

## Technical Decisions

### Key Architecture Choices

1. **Module-Based Architecture**
   - Evidence pack as self-contained library
   - Clear separation from other CATH features
   - Reusable patterns for future modules

2. **Prisma for Data Access**
   - Type-safe database queries
   - Migration management
   - Relationship handling

3. **File Storage Strategy**
   - Initial: Local file system in secure directory
   - Future: Azure Blob Storage for scalability
   - Virus scanning before storage

4. **Search Implementation**
   - PostgreSQL full-text search for simplicity
   - Sufficient for expected data volumes
   - Can migrate to Elasticsearch if needed

5. **PDF Generation**
   - Use Puppeteer or similar for HTML-to-PDF
   - Leverage Nunjucks templates for consistency
   - Support for custom branding

6. **Authorization Model**
   - Role-based access control (RBAC)
   - Roles: System Admin, Governance Lead, Auditor, Viewer
   - Enforced at both route and service levels

## Testing Strategy

### Unit Tests
- All service functions
- Validation schemas
- Query functions
- Business logic

### Integration Tests
- Database operations
- File upload/download
- Report generation
- Search functionality

### E2E Tests
- Complete workflows (add research, create benchmark, record metric)
- Report generation end-to-end
- Search across content types
- Access control enforcement

### Accessibility Tests
- WCAG 2.2 AA compliance
- Screen reader compatibility
- Keyboard navigation
- Focus management

## Security Considerations

### Authentication & Authorization
- HMCTS SSO integration
- Role-based permissions
- Route-level authorization checks
- Service-level authorization validation

### Data Protection
- Sensitive information classification
- Encryption at rest for file storage
- Audit logging for all operations
- GDPR compliance for personal data

### Input Validation
- Zod schemas for all inputs
- File upload restrictions (type, size)
- SQL injection prevention (Prisma)
- XSS prevention (Nunjucks escaping)

### Secure File Handling
- Restricted file types
- Virus scanning
- Secure storage location
- Access control on downloads

## Performance Requirements

### Response Times
- Page loads: < 2 seconds
- Search results: < 2 seconds
- Report generation: < 30 seconds
- File uploads: < 10 seconds (for reasonable file sizes)

### Scalability
- Support 50+ concurrent users
- Handle 1000+ research sources
- Manage 100+ benchmark requirements
- Store 5000+ evidence items
- Track 50+ metrics over time

### Database Optimization
- Appropriate indexes on frequently queried fields
- Pagination for large result sets
- Query optimization for complex joins
- Connection pooling

## Monitoring and Observability

### Metrics to Track
- Evidence pack generation success rate
- Search query performance
- File upload success rate
- User activity by role
- Most accessed evidence items

### Logging
- All CRUD operations
- Search queries
- Report generations
- File uploads/downloads
- Authorization failures

### Alerting
- Failed report generations
- File upload errors
- Database connection issues
- Authentication failures

## Future Enhancements

### Phase 2 Potential Features
- Automated research source import from academic databases
- AI-powered research summarization
- Automated benchmark alignment checking
- Real-time metric dashboards
- Integration with external compliance tools
- Public evidence portal (redacted)
- Collaborative editing for evidence items
- Workflow automation for evidence collection

## Definition of Done

- [ ] All database schemas created and migrated
- [ ] All services implemented with tests
- [ ] All UI pages functional and accessible
- [ ] Search working across all content types
- [ ] Report generation producing quality outputs
- [ ] Authorization enforced throughout
- [ ] Audit logging capturing all operations
- [ ] E2E tests passing
- [ ] Accessibility tests passing (WCAG 2.2 AA)
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Deployed to test environment
- [ ] User acceptance testing passed
- [ ] Production deployment completed
