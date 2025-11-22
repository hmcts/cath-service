# VIBE-99 Tasks: KPI04 Evidential Pack Implementation

## Phase 1: Foundation (Week 1-2)

### Module Setup
- [ ] Create `libs/evidence-pack` directory structure
- [ ] Create `package.json` with proper exports configuration
  - [ ] Add main exports for business logic
  - [ ] Add `/config` export for module configuration
  - [ ] Configure build scripts including nunjucks copy
- [ ] Create `tsconfig.json` extending root config
- [ ] Add `@hmcts/evidence-pack` to root `tsconfig.json` paths
- [ ] Create `vitest.config.ts` for testing
- [ ] Create `.gitignore` for module-specific exclusions

### Database Schema
- [ ] Create `libs/evidence-pack/prisma/schema.prisma`
- [ ] Define `ResearchSource` model
- [ ] Define `BenchmarkStandard` model
- [ ] Define `BenchmarkRequirement` model
- [ ] Define `EvidenceItem` model
- [ ] Define `Kpi04Metric` model
- [ ] Define `MetricMeasurement` model
- [ ] Define `EvidencePackVersion` model
- [ ] Add appropriate indexes for performance
- [ ] Export prisma schema path in `src/config.ts`
- [ ] Add schema to `apps/postgres/src/schema-discovery.ts`
- [ ] Run `yarn db:migrate:dev` to create migration
- [ ] Run `yarn db:generate` to generate Prisma client
- [ ] Verify schema in Prisma Studio

### Authentication & Authorization
- [ ] Create `src/evidence-pack/authorize-middleware.ts`
- [ ] Define roles: SystemAdmin, GovernanceLead, Auditor, Viewer
- [ ] Implement role checking logic
- [ ] Add authorization to route handlers
- [ ] Create authorization tests
- [ ] Document role permissions

### Base Infrastructure
- [ ] Create `src/evidence-pack/models.ts` for TypeScript types
- [ ] Create `src/evidence-pack/validation.ts` for Zod schemas
- [ ] Create error handling utilities
- [ ] Set up audit logging helper
- [ ] Create base query utilities
- [ ] Add pagination helper functions
- [ ] Create `src/config.ts` with module configuration
- [ ] Create `src/index.ts` with business logic exports

### Module Registration
- [ ] Import module config in `apps/web/src/app.ts`
- [ ] Register page routes with simple-router
- [ ] Register module assets in Vite config
- [ ] Add module dependency to `apps/web/package.json`
- [ ] Test module loading

## Phase 2: Research Management (Week 3-4)

### Research Source Data Layer
- [ ] Create `src/evidence-pack/research-queries.ts`
- [ ] Implement `findResearchSources` with filtering and pagination
- [ ] Implement `findResearchSourceById`
- [ ] Implement `createResearchSource`
- [ ] Implement `updateResearchSource`
- [ ] Implement `deleteResearchSource`
- [ ] Implement `searchResearchSources` with full-text search
- [ ] Add unit tests for all query functions

### Research Source Service
- [ ] Create `src/evidence-pack/research-service.ts`
- [ ] Implement `addResearchSource` with validation
- [ ] Implement `updateResearchSource` with validation
- [ ] Implement `deleteResearchSource` with authorization check
- [ ] Implement `getResearchSource` by ID
- [ ] Implement `listResearchSources` with filters
- [ ] Implement `searchResearchSources`
- [ ] Add duplicate detection logic
- [ ] Add citation formatting helper
- [ ] Add unit tests for service functions

### Research Source Validation
- [ ] Add `researchSourceSchema` to `validation.ts`
- [ ] Validate source type (academic, industry_report, government_guidance)
- [ ] Validate required fields (title, authors, publication date)
- [ ] Validate optional fields (URL, DOI)
- [ ] Validate text field lengths
- [ ] Add validation tests

### Research Source UI - List Page
- [ ] Create `src/pages/evidence/research/list.ts` controller
- [ ] Create `src/pages/evidence/research/list.njk` template
- [ ] Implement GET handler with filtering
- [ ] Add search functionality
- [ ] Add pagination
- [ ] Add filter by source type
- [ ] Add filter by tag
- [ ] Add sort options (date, title)
- [ ] Style with GOV.UK components

### Research Source UI - Add Page
- [ ] Create `src/pages/evidence/research/add.ts` controller
- [ ] Create `src/pages/evidence/research/add.njk` template
- [ ] Implement GET handler
- [ ] Implement POST handler with validation
- [ ] Add form fields for all research source properties
- [ ] Add tag input (multi-select or autocomplete)
- [ ] Handle validation errors
- [ ] Add success redirect
- [ ] Add cancel link

### Research Source UI - Detail Page
- [ ] Create `src/pages/evidence/research/[id].ts` controller
- [ ] Create `src/pages/evidence/research/[id].njk` template
- [ ] Display all research source fields
- [ ] Add edit link
- [ ] Add delete button with confirmation
- [ ] Show related benchmarks/evidence
- [ ] Add back to list link

### Content and Translations
- [ ] Create `src/locales/en.ts` with English content
- [ ] Create `src/locales/cy.ts` with Welsh translations
- [ ] Add research management page titles
- [ ] Add form labels and hints
- [ ] Add error messages
- [ ] Add button text
- [ ] Add validation messages
- [ ] Add success messages

### Testing
- [ ] Add E2E test for adding research source
- [ ] Add E2E test for editing research source
- [ ] Add E2E test for deleting research source
- [ ] Add E2E test for searching research sources
- [ ] Add accessibility tests for research pages

## Phase 3: Benchmark Management (Week 4-5)

### Benchmark Data Layer
- [ ] Create `src/evidence-pack/benchmark-queries.ts`
- [ ] Implement `findBenchmarkStandards` with pagination
- [ ] Implement `findBenchmarkStandardById` with requirements
- [ ] Implement `createBenchmarkStandard`
- [ ] Implement `updateBenchmarkStandard`
- [ ] Implement `deleteBenchmarkStandard`
- [ ] Implement `createBenchmarkRequirement`
- [ ] Implement `updateBenchmarkRequirement`
- [ ] Implement `deleteBenchmarkRequirement`
- [ ] Implement `findRequirementsByStandard`
- [ ] Add unit tests for query functions

### Benchmark Service
- [ ] Create `src/evidence-pack/benchmark-service.ts`
- [ ] Implement `addBenchmarkStandard`
- [ ] Implement `updateBenchmarkStandard`
- [ ] Implement `deleteBenchmarkStandard`
- [ ] Implement `getBenchmarkStandard` with requirements
- [ ] Implement `listBenchmarkStandards`
- [ ] Implement `addRequirement`
- [ ] Implement `updateRequirement` with alignment status
- [ ] Implement `deleteRequirement`
- [ ] Implement `calculateAlignmentPercentage`
- [ ] Implement `getGapAnalysis`
- [ ] Add unit tests for service functions

### Benchmark Validation
- [ ] Add `benchmarkStandardSchema` to `validation.ts`
- [ ] Add `benchmarkRequirementSchema` to `validation.ts`
- [ ] Validate alignment status enum
- [ ] Validate requirement numbers
- [ ] Add validation tests

### Benchmark UI - List Page
- [ ] Create `src/pages/evidence/benchmarks/list.ts` controller
- [ ] Create `src/pages/evidence/benchmarks/list.njk` template
- [ ] Implement GET handler
- [ ] Display benchmarks with alignment percentage
- [ ] Add sorting options
- [ ] Add filter by organization
- [ ] Add pagination
- [ ] Show summary statistics

### Benchmark UI - Add Page
- [ ] Create `src/pages/evidence/benchmarks/add.ts` controller
- [ ] Create `src/pages/evidence/benchmarks/add.njk` template
- [ ] Implement GET handler
- [ ] Implement POST handler
- [ ] Add form fields for benchmark properties
- [ ] Handle validation errors
- [ ] Add success redirect

### Benchmark UI - Detail Page
- [ ] Create `src/pages/evidence/benchmarks/[id].ts` controller
- [ ] Create `src/pages/evidence/benchmarks/[id].njk` template
- [ ] Display benchmark details
- [ ] Show list of requirements with alignment status
- [ ] Add edit requirement inline
- [ ] Add alignment status dropdown per requirement
- [ ] Show evidence mapping per requirement
- [ ] Display gap analysis summary
- [ ] Add visual alignment indicator (progress bar)
- [ ] Add edit and delete actions

### Content and Translations
- [ ] Add benchmark management content to `locales/en.ts`
- [ ] Add Welsh translations to `locales/cy.ts`
- [ ] Add alignment status labels
- [ ] Add requirement form labels
- [ ] Add gap analysis terminology

### Testing
- [ ] Add E2E test for adding benchmark standard
- [ ] Add E2E test for adding requirements
- [ ] Add E2E test for updating alignment status
- [ ] Add E2E test for gap analysis view
- [ ] Add accessibility tests for benchmark pages

## Phase 4: Evidence Collection (Week 5-6)

### Evidence Data Layer
- [ ] Create `src/evidence-pack/evidence-queries.ts`
- [ ] Implement `findEvidenceItems` with filtering and pagination
- [ ] Implement `findEvidenceItemById`
- [ ] Implement `createEvidenceItem`
- [ ] Implement `updateEvidenceItem`
- [ ] Implement `deleteEvidenceItem`
- [ ] Implement `updateVerificationStatus`
- [ ] Implement `searchEvidenceItems`
- [ ] Add unit tests for query functions

### Evidence Service
- [ ] Create `src/evidence-pack/evidence-service.ts`
- [ ] Implement `addEvidenceItem` with validation
- [ ] Implement `updateEvidenceItem`
- [ ] Implement `deleteEvidenceItem`
- [ ] Implement `getEvidenceItem`
- [ ] Implement `listEvidenceItems` with filters
- [ ] Implement `verifyEvidence`
- [ ] Implement `uploadSupportingDocument`
- [ ] Implement `downloadSupportingDocument`
- [ ] Implement `linkToMetric`
- [ ] Add unit tests for service functions

### File Storage
- [ ] Create `src/evidence-pack/file-storage.ts`
- [ ] Implement file upload validation (type, size)
- [ ] Implement secure file naming
- [ ] Implement file save to storage
- [ ] Implement file retrieval
- [ ] Implement file deletion
- [ ] Add file metadata storage
- [ ] Add virus scanning (if required)
- [ ] Add unit tests for file operations

### Evidence Validation
- [ ] Add `evidenceItemSchema` to `validation.ts`
- [ ] Validate evidence type enum
- [ ] Validate governance control field
- [ ] Validate verification status enum
- [ ] Validate file attachments
- [ ] Add validation tests

### Evidence UI - List Page
- [ ] Create `src/pages/evidence/items/list.ts` controller
- [ ] Create `src/pages/evidence/items/list.njk` template
- [ ] Implement GET handler with filtering
- [ ] Add filter by evidence type
- [ ] Add filter by governance control
- [ ] Add filter by verification status
- [ ] Add search functionality
- [ ] Add pagination
- [ ] Show verification status badges

### Evidence UI - Add Page
- [ ] Create `src/pages/evidence/items/add.ts` controller
- [ ] Create `src/pages/evidence/items/add.njk` template
- [ ] Implement GET handler
- [ ] Implement POST handler with file upload
- [ ] Add form fields for evidence properties
- [ ] Add file upload component
- [ ] Add tag input
- [ ] Handle validation errors
- [ ] Add success redirect

### Evidence UI - Detail Page
- [ ] Create `src/pages/evidence/items/[id].ts` controller
- [ ] Create `src/pages/evidence/items/[id].njk` template
- [ ] Display all evidence fields
- [ ] Show attached files with download links
- [ ] Show related metrics
- [ ] Show verification workflow
- [ ] Add verify/approve buttons (based on role)
- [ ] Add edit and delete actions
- [ ] Show audit trail

### Content and Translations
- [ ] Add evidence management content to `locales/en.ts`
- [ ] Add Welsh translations to `locales/cy.ts`
- [ ] Add evidence type labels
- [ ] Add verification status labels
- [ ] Add file upload instructions
- [ ] Add workflow step descriptions

### Testing
- [ ] Add E2E test for adding evidence item
- [ ] Add E2E test for uploading supporting document
- [ ] Add E2E test for evidence verification workflow
- [ ] Add E2E test for downloading document
- [ ] Add E2E test for deleting evidence
- [ ] Add accessibility tests for evidence pages

## Phase 5: Metrics Framework (Week 6-7)

### Metrics Data Layer
- [ ] Create `src/evidence-pack/metrics-queries.ts`
- [ ] Implement `findKpi04Metrics` with pagination
- [ ] Implement `findKpi04MetricById` with measurements
- [ ] Implement `createKpi04Metric`
- [ ] Implement `updateKpi04Metric`
- [ ] Implement `deleteKpi04Metric`
- [ ] Implement `createMetricMeasurement`
- [ ] Implement `findMeasurementsByMetric` with time range
- [ ] Implement `getLatestMeasurement`
- [ ] Implement `calculateTrend`
- [ ] Implement `getMetricStatistics`
- [ ] Add unit tests for query functions

### Metrics Service
- [ ] Create `src/evidence-pack/metrics-service.ts`
- [ ] Implement `defineMetric`
- [ ] Implement `updateMetric`
- [ ] Implement `deleteMetric`
- [ ] Implement `getMetric` with latest measurement
- [ ] Implement `listMetrics` with current status
- [ ] Implement `recordMeasurement`
- [ ] Implement `getMeasurementHistory`
- [ ] Implement `calculateTrend` (increasing, decreasing, stable)
- [ ] Implement `getAchievementStatus` (vs target)
- [ ] Implement `getMetricInsights`
- [ ] Add unit tests for service functions

### Metrics Validation
- [ ] Add `kpi04MetricSchema` to `validation.ts`
- [ ] Add `metricMeasurementSchema` to `validation.ts`
- [ ] Validate measurement frequency enum
- [ ] Validate category enum
- [ ] Validate numeric values (baseline, target, measurement)
- [ ] Add validation tests

### Metrics UI - Dashboard
- [ ] Create `src/pages/evidence/metrics/list.ts` controller
- [ ] Create `src/pages/evidence/metrics/list.njk` template
- [ ] Implement GET handler
- [ ] Display metrics summary cards
- [ ] Show current value vs target
- [ ] Show trend indicators (up, down, stable)
- [ ] Add filter by category
- [ ] Add status indicators (on-track, at-risk, off-track)
- [ ] Add charts for key metrics

### Metrics UI - Detail Page
- [ ] Create `src/pages/evidence/metrics/[id].ts` controller
- [ ] Create `src/pages/evidence/metrics/[id].njk` template
- [ ] Display metric definition
- [ ] Show measurement history table
- [ ] Add trend chart
- [ ] Show achievement status
- [ ] Show related evidence items
- [ ] Add record measurement button
- [ ] Add edit metric button

### Metrics UI - Record Measurement
- [ ] Create `src/pages/evidence/metrics/record.ts` controller
- [ ] Create `src/pages/evidence/metrics/record.njk` template
- [ ] Implement GET handler
- [ ] Implement POST handler
- [ ] Add form for measurement value and date
- [ ] Add notes field
- [ ] Link to supporting evidence
- [ ] Handle validation errors
- [ ] Add success redirect with feedback

### Chart Implementation
- [ ] Create `src/assets/js/metrics-charts.ts`
- [ ] Use Chart.js or similar library
- [ ] Implement trend line chart
- [ ] Implement target achievement chart
- [ ] Add interactive tooltips
- [ ] Ensure accessibility (alt text, data tables)

### Content and Translations
- [ ] Add metrics content to `locales/en.ts`
- [ ] Add Welsh translations to `locales/cy.ts`
- [ ] Add metric category labels
- [ ] Add frequency labels
- [ ] Add status labels (on-track, at-risk, etc.)
- [ ] Add chart labels and legends
- [ ] Add measurement form labels

### Testing
- [ ] Add E2E test for defining metric
- [ ] Add E2E test for recording measurement
- [ ] Add E2E test for viewing metric history
- [ ] Add E2E test for trend calculation
- [ ] Add E2E test for dashboard view
- [ ] Add accessibility tests for metrics pages

## Phase 6: Reporting (Week 7-8)

### Report Data Layer
- [ ] Create `src/evidence-pack/report-queries.ts`
- [ ] Implement `findEvidencePackVersions` with pagination
- [ ] Implement `findEvidencePackVersionById`
- [ ] Implement `createEvidencePackVersion`
- [ ] Implement `updateEvidencePackVersion`
- [ ] Implement `deleteEvidencePackVersion`
- [ ] Implement `getReportData` (aggregate from all sources)
- [ ] Add unit tests for query functions

### Report Service
- [ ] Create `src/evidence-pack/report-service.ts`
- [ ] Implement `initiateReportGeneration`
- [ ] Implement `aggregateResearchSources`
- [ ] Implement `aggregateBenchmarks`
- [ ] Implement `aggregateEvidence`
- [ ] Implement `aggregateMetrics`
- [ ] Implement `generateExecutiveSummary`
- [ ] Implement `compileFullReport`
- [ ] Implement `updateReportVersion`
- [ ] Implement `approveReport`
- [ ] Implement `publishReport`
- [ ] Add unit tests for service functions

### PDF Generation
- [ ] Create `src/evidence-pack/pdf-generator.ts`
- [ ] Set up Puppeteer or similar
- [ ] Create report HTML template
- [ ] Implement page formatting
- [ ] Add header and footer
- [ ] Add table of contents
- [ ] Add page numbers
- [ ] Implement PDF generation from HTML
- [ ] Add branding and styling
- [ ] Test PDF output quality

### Report Templates
- [ ] Create Nunjucks templates for report sections
- [ ] Executive summary template
- [ ] Research synthesis template
- [ ] Benchmark analysis template
- [ ] Evidence compilation template
- [ ] Metrics dashboard template
- [ ] Appendices template
- [ ] Ensure consistent formatting

### Report UI - List Page
- [ ] Create `src/pages/evidence/reports/list.ts` controller
- [ ] Create `src/pages/evidence/reports/list.njk` template
- [ ] Implement GET handler
- [ ] Display report versions with status
- [ ] Add filter by status (draft, approved, published)
- [ ] Add sort by date
- [ ] Show version numbers
- [ ] Add download links
- [ ] Add pagination

### Report UI - Generate Page
- [ ] Create `src/pages/evidence/reports/generate.ts` controller
- [ ] Create `src/pages/evidence/reports/generate.njk` template
- [ ] Implement GET handler
- [ ] Implement POST handler
- [ ] Add form for report parameters
- [ ] Add section selection (what to include)
- [ ] Add target audience selection
- [ ] Add date range selection
- [ ] Add summary of changes field
- [ ] Add distribution list field
- [ ] Trigger report generation
- [ ] Show progress indicator
- [ ] Redirect to report detail on completion

### Report UI - Detail Page
- [ ] Create `src/pages/evidence/reports/[id].ts` controller
- [ ] Create `src/pages/evidence/reports/[id].njk` template
- [ ] Display report metadata
- [ ] Show report status
- [ ] Add preview link
- [ ] Add download link
- [ ] Show distribution list
- [ ] Add approval workflow actions
- [ ] Show approval history
- [ ] Add delete action (for drafts)

### Export Functionality
- [ ] Create API endpoint `src/routes/evidence/export.ts`
- [ ] Implement PDF download
- [ ] Implement Word document export (optional)
- [ ] Implement CSV export for data tables
- [ ] Add secure token for download authorization
- [ ] Add download tracking
- [ ] Add file cleanup for temporary exports

### Content and Translations
- [ ] Add reporting content to `locales/en.ts`
- [ ] Add Welsh translations to `locales/cy.ts`
- [ ] Add report status labels
- [ ] Add section names
- [ ] Add generation form labels
- [ ] Add approval workflow terms

### Testing
- [ ] Add E2E test for generating report
- [ ] Add E2E test for downloading PDF
- [ ] Add E2E test for report approval workflow
- [ ] Add unit test for PDF generation
- [ ] Add unit test for data aggregation
- [ ] Add accessibility tests for report pages

## Phase 7: Search & Polish (Week 9-10)

### Search Functionality
- [ ] Create `src/evidence-pack/search-service.ts`
- [ ] Implement unified search across all content types
- [ ] Add search ranking algorithm
- [ ] Implement faceted search (filters)
- [ ] Add search highlighting
- [ ] Implement saved searches (optional)
- [ ] Add recent searches
- [ ] Add unit tests for search service

### Search API
- [ ] Create `src/routes/evidence/search.ts` API endpoint
- [ ] Implement POST handler for search
- [ ] Accept search query and filters
- [ ] Return results with metadata
- [ ] Add pagination support
- [ ] Add performance optimization

### Search UI
- [ ] Create global search component
- [ ] Add search bar to dashboard
- [ ] Create search results page
- [ ] Display results grouped by type
- [ ] Add filters sidebar
- [ ] Add search suggestions (optional)
- [ ] Style with GOV.UK components

### User Experience Enhancements
- [ ] Add bulk operations for evidence items
- [ ] Implement batch import for research sources (CSV)
- [ ] Add quick actions menu
- [ ] Improve navigation breadcrumbs
- [ ] Add keyboard shortcuts
- [ ] Add helpful tooltips
- [ ] Improve error messages
- [ ] Add contextual help

### Performance Optimization
- [ ] Review and optimize database queries
- [ ] Add indexes for frequently queried fields
- [ ] Implement query result caching (if needed)
- [ ] Add pagination to all list views
- [ ] Optimize file upload handling
- [ ] Add lazy loading for large datasets
- [ ] Profile and optimize slow pages
- [ ] Test with large data volumes

### Dashboard Implementation
- [ ] Create main dashboard at `/evidence/dashboard`
- [ ] Show summary statistics (counts of research, benchmarks, evidence, metrics)
- [ ] Show recent activity
- [ ] Show metrics summary with status
- [ ] Show upcoming report deadlines
- [ ] Add quick links to common actions
- [ ] Make dashboard responsive

### Testing & Quality Assurance
- [ ] Complete unit test coverage for all services
- [ ] Complete E2E test coverage for all workflows
- [ ] Run accessibility audit with axe
- [ ] Test with screen readers
- [ ] Test keyboard navigation throughout
- [ ] Test with JavaScript disabled (where applicable)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Load test with concurrent users
- [ ] Security audit of authorization

### Documentation
- [ ] Write user guide for evidence pack system
- [ ] Document admin workflows
- [ ] Create API documentation (if exposing APIs)
- [ ] Document database schema
- [ ] Write deployment guide
- [ ] Create troubleshooting guide
- [ ] Add inline code documentation
- [ ] Create training materials

### Code Quality
- [ ] Run Biome linter and fix issues
- [ ] Format all code with Biome
- [ ] Review and remove unused code
- [ ] Ensure all imports use `.js` extensions
- [ ] Verify all TypeScript strict mode compliance
- [ ] Review and optimize bundle size
- [ ] Add JSDoc comments for public functions

## Deployment

### Pre-Deployment
- [ ] Code review by team
- [ ] Security review
- [ ] Performance testing
- [ ] Final accessibility audit
- [ ] Stakeholder demonstration
- [ ] User acceptance testing

### Deployment Tasks
- [ ] Create deployment checklist
- [ ] Run database migrations in test environment
- [ ] Deploy to test environment
- [ ] Smoke test in test environment
- [ ] Run database migrations in production
- [ ] Deploy to production
- [ ] Smoke test in production
- [ ] Monitor for errors
- [ ] Notify stakeholders of availability

### Post-Deployment
- [ ] Monitor system performance
- [ ] Monitor error logs
- [ ] Collect user feedback
- [ ] Create backlog for improvements
- [ ] Schedule training sessions
- [ ] Plan iteration cycle

## Definition of Done

### Code Quality
- [ ] All TypeScript strict mode compliant
- [ ] All linting issues resolved
- [ ] All code formatted consistently
- [ ] No console.log statements in production code
- [ ] All imports use `.js` extensions

### Testing
- [ ] Unit test coverage >80% for business logic
- [ ] All E2E tests passing
- [ ] All accessibility tests passing (WCAG 2.2 AA)
- [ ] Manual testing completed
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed

### Documentation
- [ ] User documentation complete
- [ ] API documentation complete (if applicable)
- [ ] Code comments for complex logic
- [ ] README updated
- [ ] Deployment guide complete

### Deployment
- [ ] Deployed to test environment
- [ ] User acceptance testing passed
- [ ] Deployed to production
- [ ] Smoke tests passed
- [ ] Monitoring in place
- [ ] Stakeholders notified

### Acceptance Criteria Met
- [ ] All acceptance criteria from specification satisfied
- [ ] KPI04 metrics trackable
- [ ] Evidence pack generatable
- [ ] Research sources manageable
- [ ] Benchmarks trackable
- [ ] Evidence items collectable
- [ ] Reports distributable
- [ ] System performant and secure
