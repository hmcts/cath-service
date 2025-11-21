# VIBE-188: Educational Materials - Quality - Implementation Tasks

## Overview

Tasks for creating comprehensive educational documentation on quality metrics for HMCTS Express monorepo projects.

## Phase 1: Research and Information Gathering

- [ ] Review SonarCloud dashboard for VIBE pilot current metrics
- [ ] Analyze sonar-project.properties configuration
- [ ] Review .github/workflows/test.yml for quality gates
- [ ] Review .github/workflows/osv-scanner.yml for CVE scanning
- [ ] Identify current test coverage across modules
- [ ] Document existing security patterns in libs/web-core
- [ ] Review Prisma query patterns for security best practices
- [ ] Gather examples of quality issues and resolutions from recent PRs

## Phase 2: Document Structure Creation

- [ ] Create docs/quality-metrics.md file
- [ ] Set up table of contents with all sections
- [ ] Add document metadata (version, last updated, owner)

## Phase 3: Core Content - Introduction and Overview

- [ ] Write "Introduction to Quality Metrics" section
  - [ ] Explain purpose and value
  - [ ] Link to government service standards
  - [ ] Describe SonarCloud integration
  - [ ] Show where to view quality dashboard

## Phase 4: Core Content - Individual Metrics

### Test Coverage
- [ ] Define test coverage and calculation methods
- [ ] Document current coverage targets (>80% business logic)
- [ ] Explain lcov.info generation and merging
- [ ] Show Vitest configuration for coverage
- [ ] List coverage exclusions from sonar-project.properties
- [ ] Provide examples from libs/onboarding tests
- [ ] Add commands for running coverage locally

### CVEs (Security Vulnerabilities)
- [ ] Explain CVE severity levels
- [ ] Document OSV Scanner workflow and schedule
- [ ] Describe response procedures for each severity
- [ ] Show .github/osv-scanner.toml configuration
- [ ] Provide example of updating vulnerable dependency
- [ ] Link to GitHub Security tab

### Duplicated Code
- [ ] Define code duplication and why it matters
- [ ] Document acceptable duplication scenarios
- [ ] Explain sonar.cpd.exclusions for page templates
- [ ] Provide refactoring examples for common duplications
- [ ] Show SonarCloud duplication reports

### Maintainability
- [ ] Define maintainability rating (A-E)
- [ ] Explain technical debt ratio
- [ ] List common code smells in TypeScript/Express
- [ ] Link to CLAUDE.md principles (YAGNI, KISS, functional style)
- [ ] Provide before/after examples of maintainability improvements
- [ ] Reference naming conventions and module structure

### Reliability
- [ ] Define reliability rating (A-E)
- [ ] Explain bug detection and classification
- [ ] Document error handling patterns (async/await, middleware)
- [ ] Provide examples from libs/web-core error handling
- [ ] Show testing strategies for reliability

### Security
- [ ] Define security rating (A-E)
- [ ] List OWASP Top 10 considerations
- [ ] Document security best practices:
  - [ ] Input validation patterns
  - [ ] Parameterized queries (Prisma examples)
  - [ ] Helmet.js security headers configuration
  - [ ] Authentication/authorization middleware patterns
  - [ ] Session security (Redis/Postgres store)
- [ ] Show security hotspot examples and resolutions

## Phase 5: VIBE Pilot Application

- [ ] Document current SonarCloud project link
- [ ] Create table of current quality baselines
- [ ] Map metrics to specific VIBE pilot modules:
  - [ ] libs/onboarding test coverage examples
  - [ ] libs/web-core security middleware examples
  - [ ] apps/postgres Prisma query patterns
  - [ ] Page template duplication handling
- [ ] Document integration points in CI/CD pipeline
- [ ] Add screenshots of SonarCloud quality dashboard

## Phase 6: Success Criteria and Targets

- [ ] Create quality gates table with:
  - [ ] Minimum standards
  - [ ] Target goals
  - [ ] VIBE pilot specific goals
- [ ] Define continuous improvement process
- [ ] Document monthly quality review cadence
- [ ] Describe PR quality gate enforcement
- [ ] Add quality trend visualization guidance

## Phase 7: Developer Workflow Integration

- [ ] Document local quality check workflow
- [ ] List pre-commit quality commands
- [ ] Explain PR quality gate requirements
- [ ] Show how to view coverage reports locally
- [ ] Provide examples of interpreting SonarQube feedback
- [ ] Create quick reference guide for fixing common issues:
  - [ ] Low test coverage
  - [ ] Code duplication
  - [ ] Security hotspots
  - [ ] Code smells

## Phase 8: Troubleshooting and FAQ

- [ ] Add FAQ section with common questions:
  - [ ] Coverage percentage differences (local vs CI)
  - [ ] Excluding generated code
  - [ ] Code smell vs bug definitions
  - [ ] Security hotspot exception requests
  - [ ] Page template duplication exclusions
- [ ] Provide troubleshooting steps for common issues
- [ ] Link to relevant team contacts or channels

## Phase 9: References and Further Reading

- [ ] Add links to SonarQube documentation
- [ ] Link to OWASP Top 10
- [ ] Reference HMCTS service standards
- [ ] Link to GOV.UK service manual
- [ ] Link to CLAUDE.md for development guidelines
- [ ] Add internal wiki or confluence pages if applicable

## Phase 10: Review and Polish

- [ ] Review document for completeness
- [ ] Verify all code examples are accurate
- [ ] Test all commands and links
- [ ] Ensure consistent formatting and style
- [ ] Check markdown rendering on GitHub
- [ ] Proofread for clarity and grammar

## Phase 11: Team Review and Feedback

- [ ] Share draft with development team
- [ ] Incorporate feedback from technical leads
- [ ] Validate examples with junior developers
- [ ] Adjust complexity level based on feedback
- [ ] Ensure alignment with team practices

## Phase 12: Documentation Integration

- [ ] Add link to docs/quality-metrics.md from README.md
- [ ] Update CLAUDE.md to reference quality standards
- [ ] Add quality metrics section to onboarding documentation
- [ ] Create PR template checklist item for quality review
- [ ] Update team wiki with links to quality documentation

## Success Criteria

- [ ] Document is comprehensive and covers all six quality metrics
- [ ] VIBE pilot specific examples are included
- [ ] Clear success criteria defined for each metric
- [ ] Developer workflow integration is practical and actionable
- [ ] Team members can independently understand and apply quality guidance
- [ ] Documentation is discoverable from main README and onboarding materials

## Estimated Effort

- Research and gathering: 2-3 hours
- Content creation: 6-8 hours
- Examples and code snippets: 2-3 hours
- Review and polish: 1-2 hours
- Team feedback and revision: 2-3 hours

**Total: 13-19 hours (approximately 2-3 days)**

## Dependencies

- Access to SonarCloud dashboard for VIBE pilot
- Understanding of current CI/CD pipeline
- Examples of quality issues from recent PRs
- Input from technical leads on quality targets

## Notes

- Focus on practical, actionable guidance over theory
- Use real examples from the VIBE pilot codebase
- Keep language clear and accessible for all skill levels
- Prioritize "how to fix" over "what is wrong"
- Align with existing CLAUDE.md development philosophy (direct, practical, no cheerleading)
