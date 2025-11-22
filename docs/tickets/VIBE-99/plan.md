# VIBE-99: KPI04 Evidential Pack - Technical Implementation Plan

## Overview

This plan outlines the technical implementation for the KPI04 Evidential Pack system, which enables systematic collection, management, and reporting of academic research and market benchmarks that demonstrate CATH's AI governance effectiveness. The system supports an iterative refinement approach with a first draft due mid-October and ongoing updates through November/December based on implementation experience.

## Problem Statement

The CATH service requires a comprehensive evidence-based approach to demonstrate AI governance effectiveness (KPI04). This requires:
- Systematic management of 20+ academic sources on AI governance
- Benchmarking against industry standards (ISO 42001, NIST AI RMF, IEEE, EU AI Act)
- Tracking governance effectiveness metrics over time
- Generating evidential reports for stakeholders and auditors
- Iterative refinement as implementation experience accumulates

## Technical Approach

### Implementation Strategy

This ticket combines two parallel tracks:

1. **Research and Documentation Track**: Conducting literature review and creating the initial evidential pack document
2. **Technical System Track**: Building a web-based system for managing evidence, research sources, benchmarks, and KPI metrics over time

The system enables the governance team to:
- Store and categorize academic research sources with citations
- Map CATH approach to industry benchmark requirements
- Track KPI04 metrics with baseline, targets, and trends
- Generate formatted evidential pack reports
- Maintain version history of evidential packs

### Architecture Overview

**Module Structure**: Create `libs/evidence-pack` following HMCTS monorepo patterns

```
libs/evidence-pack/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma           # Database schema for evidence management
└── src/
    ├── config.ts               # Module configuration (pageRoutes, prismaSchemas)
    ├── index.ts                # Business logic exports
    ├── pages/                  # Admin UI for evidence management
    │   └── evidence/
    │       ├── dashboard.ts    # Main dashboard
    │       ├── research/       # Research source management
    │       ├── benchmarks/     # Benchmark tracking
    │       ├── items/          # Evidence item collection
    │       ├── metrics/        # KPI04 metric tracking
    │       └── reports/        # Evidence pack generation
    ├── locales/                # Bilingual content (en.ts, cy.ts)
    ├── evidence-pack/          # Business logic domain
    │   ├── research-service.ts
    │   ├── research-queries.ts
    │   ├── benchmark-service.ts
    │   ├── benchmark-queries.ts
    │   ├── evidence-service.ts
    │   ├── evidence-queries.ts
    │   ├── metrics-service.ts
    │   ├── metrics-queries.ts
    │   ├── report-service.ts
    │   ├── report-queries.ts
    │   ├── validation.ts       # Zod schemas
    │   └── models.ts           # TypeScript types
    └── assets/
        ├── css/
        │   └── evidence-pack.scss
        └── js/
            └── evidence-search.ts
```

## Database Schema Design

### Core Entities

**Research Sources** - Academic papers, industry reports, government guidance
- Source ID, type, title, authors, publication date
- Citation information, URL/DOI
- Summary, key findings, relevance to CATH
- Tags for categorization and search

**Benchmark Standards** - ISO 42001, NIST AI RMF, IEEE standards, etc.
- Standard ID, name, organization, version
- Individual requirements with alignment status
- CATH approach documentation
- Gap analysis notes
- Evidence mapping to requirements

**Evidence Items** - Governance policies, processes, audits, measurements
- Evidence ID, type, title, description
- Associated governance control
- File attachments
- Verification status and workflow
- Links to related KPI metrics

**KPI04 Metrics** - Measurable governance effectiveness indicators
- Metric ID, name, description
- Measurement methodology
- Baseline value and date
- Target value
- Time-series measurements with evidence
- Trend analysis and reporting

**Evidence Pack Versions** - Generated report versions
- Version number and publication date
- Summary of changes
- Review status and approval workflow
- Distribution tracking
- Generated PDF storage

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish module structure, database schema, and authentication

**Tasks**:
- [ ] Create `libs/evidence-pack` module with package.json, tsconfig.json
- [ ] Register module in root tsconfig.json paths
- [ ] Create Prisma schema with all core entities
- [ ] Add schema to postgres schema discovery
- [ ] Generate and apply database migrations
- [ ] Implement authorization middleware (System Admin, Governance Lead, Auditor roles)
- [ ] Create base service and query patterns
- [ ] Set up audit logging infrastructure

**Deliverables**:
- Module structure complete and registered
- Database schema deployed to PostgreSQL
- Role-based authorization working
- Base patterns established

**Files Created**:
- `libs/evidence-pack/package.json`
- `libs/evidence-pack/tsconfig.json`
- `libs/evidence-pack/prisma/schema.prisma`
- `libs/evidence-pack/src/config.ts`
- `libs/evidence-pack/src/index.ts`
- `libs/evidence-pack/src/evidence-pack/models.ts`

### Phase 2: Research Source Management (Weeks 3-4)

**Goal**: Enable capture and management of academic research sources

**Tasks**:
- [ ] Implement `research-queries.ts` for CRUD operations
- [ ] Create `research-service.ts` with validation and business logic
- [ ] Build research list page with filtering and search
- [ ] Create add/edit research source forms
- [ ] Implement research source detail view
- [ ] Add full-text search across research sources
- [ ] Implement tag-based categorization
- [ ] Create citation formatting utilities
- [ ] Add bilingual content (English and Welsh)

**Deliverables**:
- 20+ research sources storable with full metadata
- Search and filtering by tags, source type, date
- Proper citation formatting
- GOV.UK Design System compliant UI

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/research-service.ts`
- `libs/evidence-pack/src/evidence-pack/research-queries.ts`
- `libs/evidence-pack/src/pages/evidence/research/list.ts`
- `libs/evidence-pack/src/pages/evidence/research/list.njk`
- `libs/evidence-pack/src/pages/evidence/research/add.ts`
- `libs/evidence-pack/src/pages/evidence/research/add.njk`
- `libs/evidence-pack/src/locales/en.ts`
- `libs/evidence-pack/src/locales/cy.ts`

### Phase 3: Benchmark Tracking (Weeks 4-5)

**Goal**: Track alignment with industry standards and identify gaps

**Tasks**:
- [ ] Implement `benchmark-queries.ts` with nested requirement handling
- [ ] Create `benchmark-service.ts` for alignment tracking
- [ ] Build benchmark list and detail pages
- [ ] Create requirement alignment editor UI
- [ ] Implement gap analysis reporting
- [ ] Add evidence mapping to requirements
- [ ] Calculate alignment percentages
- [ ] Generate benchmark comparison reports

**Deliverables**:
- ISO 42001, NIST AI RMF, IEEE standards trackable
- Requirements mapped to CATH approach
- Gap analysis visible
- Alignment percentages calculated

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/benchmark-service.ts`
- `libs/evidence-pack/src/evidence-pack/benchmark-queries.ts`
- `libs/evidence-pack/src/pages/evidence/benchmarks/list.ts`
- `libs/evidence-pack/src/pages/evidence/benchmarks/list.njk`
- `libs/evidence-pack/src/pages/evidence/benchmarks/[id].ts`
- `libs/evidence-pack/src/pages/evidence/benchmarks/[id].njk`

### Phase 4: Evidence Item Collection (Weeks 5-6)

**Goal**: Collect and verify governance evidence items

**Tasks**:
- [ ] Implement `evidence-queries.ts` for evidence CRUD
- [ ] Create `evidence-service.ts` with verification workflow
- [ ] Build evidence list with filtering by type, status, control
- [ ] Create add/edit evidence item forms
- [ ] Implement file upload and storage for supporting documents
- [ ] Add verification workflow (draft, verified, approved)
- [ ] Create evidence detail view with file downloads
- [ ] Implement tagging and categorization

**Deliverables**:
- Evidence items (policies, processes, audits) storable
- File attachments working securely
- Verification workflow functional
- Search and filtering by governance control

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/evidence-service.ts`
- `libs/evidence-pack/src/evidence-pack/evidence-queries.ts`
- `libs/evidence-pack/src/pages/evidence/items/list.ts`
- `libs/evidence-pack/src/pages/evidence/items/list.njk`
- `libs/evidence-pack/src/pages/evidence/items/add.ts`
- `libs/evidence-pack/src/pages/evidence/items/add.njk`

### Phase 5: KPI04 Metrics Framework (Weeks 6-7)

**Goal**: Define and track governance effectiveness metrics

**Tasks**:
- [ ] Implement `metrics-queries.ts` for metrics and measurements
- [ ] Create `metrics-service.ts` with trend analysis
- [ ] Define initial KPI04 metrics (governance effectiveness indicators)
- [ ] Build metrics dashboard showing current status
- [ ] Create measurement recording interface
- [ ] Implement metric detail view with time-series charts
- [ ] Add baseline and target tracking
- [ ] Calculate trends (improving, stable, declining)
- [ ] Generate metric reports

**Deliverables**:
- KPI04 metrics defined with baselines
- Measurements recordable with supporting evidence
- Trend analysis visible
- Dashboard showing metric status

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/metrics-service.ts`
- `libs/evidence-pack/src/evidence-pack/metrics-queries.ts`
- `libs/evidence-pack/src/pages/evidence/metrics/list.ts`
- `libs/evidence-pack/src/pages/evidence/metrics/list.njk`
- `libs/evidence-pack/src/pages/evidence/metrics/[id].ts`
- `libs/evidence-pack/src/pages/evidence/metrics/[id].njk`
- `libs/evidence-pack/src/pages/evidence/metrics/record.ts`
- `libs/evidence-pack/src/pages/evidence/metrics/record.njk`

### Phase 6: Evidence Pack Generation (Weeks 7-8)

**Goal**: Generate formatted evidential pack reports

**Tasks**:
- [ ] Implement `report-queries.ts` for aggregating data
- [ ] Create `report-service.ts` for report generation
- [ ] Design evidence pack template structure
- [ ] Implement executive summary generation
- [ ] Build academic research synthesis section
- [ ] Create market benchmarking section
- [ ] Add CATH governance evidence section
- [ ] Include KPI04 metrics section
- [ ] Generate PDF output using Puppeteer or similar
- [ ] Implement version management
- [ ] Add distribution tracking
- [ ] Create report preview interface

**Deliverables**:
- Evidence pack generatable in PDF format
- Executive summary suitable for steering group
- Detailed sections with proper citations
- Version control for iterative refinement

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/report-service.ts`
- `libs/evidence-pack/src/evidence-pack/report-queries.ts`
- `libs/evidence-pack/src/pages/evidence/reports/list.ts`
- `libs/evidence-pack/src/pages/evidence/reports/list.njk`
- `libs/evidence-pack/src/pages/evidence/reports/generate.ts`
- `libs/evidence-pack/src/pages/evidence/reports/generate.njk`
- `libs/evidence-pack/src/pages/evidence/reports/[id].ts`
- `libs/evidence-pack/src/pages/evidence/reports/[id].njk`

### Phase 7: Search, Testing, and Polish (Weeks 9-10)

**Goal**: Complete system with search, tests, and documentation

**Tasks**:
- [ ] Implement unified search across all content types
- [ ] Add advanced filtering and saved searches
- [ ] Create main dashboard with overview statistics
- [ ] Implement bulk operations where appropriate
- [ ] Add E2E tests with Playwright for all workflows
- [ ] Write comprehensive unit tests (>80% coverage)
- [ ] Conduct accessibility testing (WCAG 2.2 AA)
- [ ] Optimize database queries and add indexes
- [ ] Create user documentation and admin guide
- [ ] Conduct security review
- [ ] Performance testing and optimization

**Deliverables**:
- Search working across all evidence types
- Comprehensive test suite passing
- WCAG 2.2 AA compliance verified
- User documentation complete

**Files Created**:
- `libs/evidence-pack/src/evidence-pack/search-service.ts`
- `libs/evidence-pack/src/pages/evidence/dashboard.ts`
- `libs/evidence-pack/src/pages/evidence/dashboard.njk`
- E2E test files in project test directory
- User documentation

## Iterative Refinement Approach

### First Draft (Mid-October Target)

**Weeks 1-4 Focus**:
- Complete Phases 1-3 (Foundation, Research, Benchmarks)
- Enter initial 20+ research sources
- Map CATH approach to major standards (ISO 42001, NIST)
- Generate first draft evidential pack
- Submit to AI Steering Group

**First Draft Contents**:
1. Executive Summary
2. Academic Research Synthesis (20+ sources)
3. Market Benchmarking Analysis (ISO, NIST, IEEE, EU AI Act)
4. CATH Governance Approach Documentation
5. Initial KPI04 Metrics Framework (defined but not yet measured)
6. Evidence Appendices

### Updates Through November/December

**Weeks 5-10 Focus**:
- Complete Phases 4-7 (Evidence, Metrics, Reporting, Polish)
- Begin collecting implementation evidence
- Record initial KPI04 metric measurements
- Refine benchmarking based on feedback
- Update evidential pack monthly

**Updated Pack Contents**:
- Refined executive summary based on stakeholder feedback
- Updated research synthesis with additional sources
- Gap analysis addressing identified areas
- Implementation evidence (policies, processes, audits)
- KPI04 metrics with baseline measurements and trends
- Lessons learned from implementation experience

### Continuous Improvement Process

**Monthly Review Cycle**:
- Review new governance evidence collected
- Record KPI04 metric measurements
- Update benchmark alignment status
- Capture implementation lessons learned
- Generate updated evidential pack version
- Distribute to AI Steering Group

## Technical Decisions

### Key Architecture Choices

1. **Monorepo Module Pattern**: Self-contained `libs/evidence-pack` following HMCTS standards
2. **Prisma ORM**: Type-safe database access with migration management
3. **PostgreSQL Full-Text Search**: Sufficient for expected data volumes, simple implementation
4. **File Storage**: Local file system initially, Azure Blob Storage for production
5. **PDF Generation**: Puppeteer for HTML-to-PDF using Nunjucks templates
6. **Role-Based Access Control**: System Admin, Governance Lead, Auditor, Viewer roles
7. **Audit Logging**: All operations logged for compliance and debugging

### Technology Stack

- **Backend**: Express.js 5.x with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: GOV.UK Design System with Nunjucks templates
- **Validation**: Zod for type-safe input validation
- **Testing**: Vitest for unit tests, Playwright for E2E
- **PDF Generation**: Puppeteer or similar library

## Testing Strategy

### Unit Tests
- All service functions with business logic
- Validation schemas with edge cases
- Query functions with mock data
- Utility functions

**Target**: >80% code coverage

### Integration Tests
- Database operations with test database
- File upload and download workflows
- Report generation end-to-end
- Search functionality with real data

### E2E Tests with Playwright
- Add research source workflow
- Create benchmark and map requirements
- Record evidence item with file upload
- Record KPI04 metric measurement
- Generate evidence pack report
- Search across content types
- Access control enforcement

### Accessibility Tests
- WCAG 2.2 AA compliance with axe-core
- Screen reader compatibility testing
- Keyboard navigation completeness
- Focus management verification

## Security Considerations

### Authentication & Authorization
- HMCTS SSO integration for user authentication
- Role-based permissions enforced at route level
- Service-level authorization checks
- Audit logging of all sensitive operations

### Data Protection
- Sensitive governance information classification
- Encryption at rest for file storage
- Secure file download with access control
- GDPR compliance for any personal data
- Data retention policies

### Input Validation
- Zod schemas for all form inputs
- File upload restrictions (type, size, virus scanning)
- SQL injection prevention via Prisma
- XSS prevention via Nunjucks auto-escaping
- CSRF protection via Express session

## Performance Requirements

### Response Times
- Page loads: < 2 seconds
- Search results: < 2 seconds
- Report generation: < 30 seconds
- File uploads: < 10 seconds

### Scalability
- Support 50+ concurrent users
- Handle 1000+ research sources
- Manage 100+ benchmark requirements
- Store 5000+ evidence items
- Track 50+ metrics over time

### Database Optimization
- Indexes on frequently queried fields
- Pagination for large result sets
- Query optimization for complex aggregations
- Connection pooling

## Monitoring and Observability

### Metrics to Track
- Evidence pack generation success rate
- Search query performance
- File upload success/failure rate
- User activity by role
- Most accessed evidence items

### Logging
- All CRUD operations with user context
- Search queries for optimization
- Report generations
- File uploads and downloads
- Authorization failures

### Alerting
- Failed report generations
- File upload errors
- Database connection issues
- Authentication failures

## Definition of Done

- [ ] All database schemas created and migrations applied
- [ ] All services implemented with comprehensive tests
- [ ] All UI pages functional, accessible (WCAG 2.2 AA), and bilingual
- [ ] Search working across all content types
- [ ] Report generation producing quality PDF outputs
- [ ] Authorization enforced throughout application
- [ ] Audit logging capturing all operations
- [ ] Unit tests achieving >80% coverage
- [ ] E2E tests passing for all workflows
- [ ] Accessibility tests passing
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] User documentation written
- [ ] Code review completed
- [ ] First draft evidential pack generated (mid-October)
- [ ] Monthly update process established (through Nov/Dec)
- [ ] Deployed to production

## Success Criteria

### Functional Success
- 20+ academic research sources properly stored and searchable
- CATH approach mapped to ISO 42001, NIST AI RMF, IEEE standards
- KPI04 metrics defined, measured, and trending
- Evidence pack generatable with one click
- Iterative refinement process working

### Governance Success
- First draft evidential pack submitted mid-October
- AI Steering Group satisfied with evidence quality
- Demonstrates compliance with government AI standards
- Provides audit-ready documentation
- Supports continuous governance improvement

### Technical Success
- Follows HMCTS monorepo standards (CLAUDE.md)
- Passes all accessibility requirements (WCAG 2.2 AA)
- Maintains acceptable performance (<2s page loads)
- Properly tested and documented
- Secure and compliant with data protection requirements

## Dependencies

### Technical Dependencies
- HMCTS SSO for authentication
- PostgreSQL database availability
- File storage infrastructure
- PDF generation library
- Postgres schema registration

### Organizational Dependencies
- AI Governance Lead input on KPI04 metric definitions
- Access to academic research sources (organizational library or subscriptions)
- Budget for market research procurement if needed
- Stakeholder review and feedback cycles
- AI Steering Group availability for reviews

## Risks and Mitigations

### Risk: Scope Creep
**Likelihood**: Medium (3)
**Impact**: High (4)
**Mitigation**:
- Clear definition of KPI04 focus in specification
- Phased approach with incremental delivery
- Regular stakeholder alignment meetings
- Out-of-scope items documented for future phases

### Risk: Academic Research Access
**Likelihood**: Medium (3)
**Impact**: Medium (3)
**Mitigation**:
- Partner with organizational library services
- Use open-access academic sources (arXiv, gov.uk)
- Budget for necessary subscriptions
- Focus on quality over quantity (20+ sources sufficient)

### Risk: Changing Standards
**Likelihood**: Medium (3)
**Impact**: Medium (3)
**Mitigation**:
- Version control for benchmark standards
- Flexible evidence mapping allowing updates
- Regular review cycles to catch standard changes
- Subscribe to standard organization updates

### Risk: Resource Availability
**Likelihood**: Low (2)
**Impact**: High (4)
**Mitigation**:
- Modular implementation allowing incremental delivery
- Clear prioritization (first draft most critical)
- Parallel work streams where possible
- Contingency time in schedule

### Risk: Report Generation Performance
**Likelihood**: Low (2)
**Impact**: Medium (3)
**Mitigation**:
- Performance testing during Phase 6
- Optimize PDF generation process
- Consider async generation for large reports
- Implement caching where appropriate

## Timeline Summary

**Total Duration**: 10 weeks

**Critical Milestones**:
- Week 2: Database schema deployed
- Week 4: First draft evidential pack generatable (mid-October target)
- Week 6: Evidence collection system functional
- Week 7: KPI04 metrics trackable
- Week 8: Report generation polished
- Week 10: System complete and production-ready

**Monthly Updates**: November through December
- Monthly update cycle established
- Implementation experience captured
- KPI04 metrics measured and trending
- Evidential pack refined based on feedback

## Next Steps

1. Review and approve this technical plan
2. Confirm AI Governance Lead availability for KPI04 definition
3. Create JIRA sub-tasks for each phase
4. Assign development resources
5. Begin Phase 1: Foundation work
6. Schedule first stakeholder review for mid-October first draft

## References

- VIBE-99 Specification: `docs/tickets/VIBE-99/specification.md`
- VIBE-99 Tasks: `docs/tickets/VIBE-99/tasks.md`
- HMCTS Standards: `CLAUDE.md`
- Government Service Standard: https://www.gov.uk/service-manual/service-standard
- ISO 42001: AI Management System Standard
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- GOV.UK Design System: https://design-system.service.gov.uk/
- WCAG 2.2 AA: https://www.w3.org/WAI/WCAG22/quickref/
