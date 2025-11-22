# VIBE-188 Educational Materials - Quality - Technical Plan

## Overview

This ticket involves creating comprehensive educational documentation about quality metrics for the VIBE coding pilot program. This is a documentation task - the deliverable is a quality metrics guide (`docs/quality-metrics.md`) that helps HMCTS developers understand, measure, and improve code quality using SonarCloud, test coverage, CVE scanning, and other automated quality tools.

## Technical Approach

### Documentation Strategy

This is a **documentation and knowledge transfer** task with the following approach:

1. **Quality Metrics Documentation**: Create a comprehensive guide explaining six core quality metrics (Test Coverage, CVEs, Duplicated Code, Maintainability, Reliability, Security)
2. **VIBE Pilot Integration**: Map generic quality metrics to specific VIBE pilot implementation with real examples from the codebase
3. **Developer Workflow Integration**: Show developers how quality metrics fit into daily work (local checks, PR reviews, CI/CD)
4. **Actionable Guidance**: Provide practical "how to fix" guidance for common quality issues

### Document Structure

The quality metrics documentation will follow a structured format:
- **Introduction**: Purpose and value of quality metrics for government services
- **Six Core Metrics**: Detailed explanation of each metric with measurement methods and examples
- **VIBE Pilot Application**: Project-specific configuration, baselines, and examples
- **Success Criteria**: Clear quality gates and targets ("what good looks like")
- **Developer Workflow**: Integration into daily development practices
- **Troubleshooting**: FAQ and common issues with solutions
- **References**: Links to standards, tools, and further reading

## Implementation Phases

### Phase 1: Research and Information Gathering
**Goal**: Collect current quality metrics and implementation details

**Tasks**:
- [ ] Review SonarCloud dashboard for VIBE pilot current metrics
- [ ] Analyze `sonar-project.properties` configuration
- [ ] Review `.github/workflows/test.yml` for quality gates
- [ ] Review `.github/workflows/osv-scanner.yml` for CVE scanning
- [ ] Identify current test coverage across modules (libs/onboarding, libs/web-core)
- [ ] Document existing security patterns in libs/web-core
- [ ] Review Prisma query patterns for security best practices
- [ ] Gather examples of quality issues and resolutions from recent PRs

**Deliverables**:
- Current quality metrics snapshot
- Configuration files analysis
- Example quality issues list

**Files to Review**:
- `sonar-project.properties`
- `.github/workflows/test.yml`
- `.github/workflows/osv-scanner.yml`
- `.github/osv-scanner.toml`
- `libs/onboarding/src/**/*.test.ts`
- `libs/web-core/src/`

### Phase 2: Document Structure Creation
**Goal**: Set up document skeleton with table of contents

**Tasks**:
- [ ] Create `docs/quality-metrics.md` file
- [ ] Set up table of contents with all sections
- [ ] Add document metadata (version, last updated, owner)
- [ ] Define consistent formatting style

**Deliverables**:
- Document skeleton with navigation structure

**Files to Create**:
- `docs/quality-metrics.md`

### Phase 3: Core Content - Introduction and Overview
**Goal**: Write introduction explaining purpose and value of quality metrics

**Tasks**:
- [ ] Write "Introduction to Quality Metrics" section
- [ ] Explain purpose and value for government services
- [ ] Link to government service standards
- [ ] Describe SonarCloud integration
- [ ] Show where to view quality dashboard
- [ ] Explain relationship between quality and service reliability

**Deliverables**:
- Completed introduction section with SonarCloud dashboard link

**Content Focus**:
- Why quality matters for HMCTS services
- How automated quality analysis works
- Overview of tools used (SonarCloud, Vitest, OSV Scanner)

### Phase 4: Core Content - Test Coverage
**Goal**: Document test coverage metric comprehensively

**Tasks**:
- [ ] Define test coverage and calculation methods (line, branch)
- [ ] Document current coverage targets (>80% business logic)
- [ ] Explain lcov.info generation and merging process
- [ ] Show Vitest configuration for coverage
- [ ] List coverage exclusions from `sonar-project.properties`
- [ ] Provide examples from `libs/onboarding` tests
- [ ] Add commands for running coverage locally (`yarn test:coverage`)
- [ ] Explain how to view coverage reports (`open coverage/index.html`)

**Deliverables**:
- Complete test coverage section with examples and commands

**Code Examples**:
- Vitest configuration snippets
- Example test files from libs/onboarding
- Coverage exclusion patterns

### Phase 5: Core Content - CVEs (Security Vulnerabilities)
**Goal**: Document CVE scanning and vulnerability management

**Tasks**:
- [ ] Explain CVE severity levels (Critical, High, Medium, Low)
- [ ] Document OSV Scanner workflow and schedule (daily)
- [ ] Describe response procedures for each severity
- [ ] Show `.github/osv-scanner.toml` configuration
- [ ] Provide example of updating vulnerable dependency
- [ ] Link to GitHub Security tab
- [ ] Explain acceptable CVE thresholds (0 critical, ≤2 high with plan)

**Deliverables**:
- Complete CVE section with severity matrix and response procedures

**Content Focus**:
- What CVEs are and why they matter
- How OSV Scanner detects vulnerabilities
- Step-by-step remediation process

### Phase 6: Core Content - Duplicated Code
**Goal**: Document code duplication detection and acceptable scenarios

**Tasks**:
- [ ] Define code duplication and why it matters
- [ ] Document acceptable duplication scenarios (page templates)
- [ ] Explain `sonar.cpd.exclusions` for page templates
- [ ] Provide refactoring examples for common duplications
- [ ] Show SonarCloud duplication reports
- [ ] Target: <3% duplicated lines

**Deliverables**:
- Complete duplication section with refactoring examples

**Code Examples**:
- Before/after refactoring examples
- Acceptable duplication patterns

### Phase 7: Core Content - Maintainability
**Goal**: Document maintainability rating and improvement strategies

**Tasks**:
- [ ] Define maintainability rating (A-E)
- [ ] Explain technical debt ratio calculation
- [ ] List common code smells in TypeScript/Express
- [ ] Link to CLAUDE.md principles (YAGNI, KISS, functional style)
- [ ] Provide before/after examples of maintainability improvements
- [ ] Reference naming conventions and module structure
- [ ] Target: A rating

**Deliverables**:
- Complete maintainability section with code smell examples

**Content Focus**:
- What maintainability means
- How technical debt accumulates
- Practical refactoring strategies

### Phase 8: Core Content - Reliability
**Goal**: Document reliability rating and bug prevention

**Tasks**:
- [ ] Define reliability rating (A-E)
- [ ] Explain bug detection and classification
- [ ] Document error handling patterns (async/await, middleware)
- [ ] Provide examples from `libs/web-core` error handling
- [ ] Show testing strategies for reliability
- [ ] Target: A rating

**Deliverables**:
- Complete reliability section with error handling patterns

**Code Examples**:
- Proper async/await error handling
- Express middleware error handling
- Testing edge cases

### Phase 9: Core Content - Security
**Goal**: Document security rating and best practices

**Tasks**:
- [ ] Define security rating (A-E)
- [ ] List OWASP Top 10 considerations
- [ ] Document security best practices:
  - [ ] Input validation patterns
  - [ ] Parameterized queries (Prisma examples)
  - [ ] Helmet.js security headers configuration
  - [ ] Authentication/authorization middleware patterns
  - [ ] Session security (Redis/Postgres store)
- [ ] Show security hotspot examples and resolutions
- [ ] Target: A rating

**Deliverables**:
- Complete security section with OWASP mapping

**Code Examples**:
- Input validation with Zod
- Prisma parameterized queries
- Security middleware configuration

### Phase 10: VIBE Pilot Application
**Goal**: Map metrics to specific VIBE pilot implementation

**Tasks**:
- [ ] Document current SonarCloud project link
- [ ] Create table of current quality baselines
- [ ] Map metrics to specific VIBE pilot modules:
  - [ ] `libs/onboarding` test coverage examples
  - [ ] `libs/web-core` security middleware examples
  - [ ] `apps/postgres` Prisma query patterns
  - [ ] Page template duplication handling
- [ ] Document integration points in CI/CD pipeline
- [ ] Add screenshots or links to SonarCloud quality dashboard

**Deliverables**:
- VIBE pilot specific section with real examples from codebase

**Files to Reference**:
- `libs/onboarding/src/**/*.test.ts`
- `libs/web-core/src/`
- `apps/postgres/prisma/schema.prisma`
- `.github/workflows/test.yml`

### Phase 11: Success Criteria and Quality Gates
**Goal**: Define clear, measurable targets for each metric

**Tasks**:
- [ ] Create quality gates table with:
  - [ ] Minimum standards
  - [ ] Target goals
  - [ ] VIBE pilot specific goals
- [ ] Define continuous improvement process
- [ ] Document monthly quality review cadence
- [ ] Describe PR quality gate enforcement
- [ ] Add guidance for quality trend monitoring

**Deliverables**:
- Quality gates table with clear targets
- Continuous improvement process description

**Quality Gates Table**:
| Metric | Minimum Standard | Target | VIBE Pilot Goal |
|--------|------------------|--------|-----------------|
| Test Coverage | 70% overall | 80% business logic | 85% by Q2 2025 |
| CVEs (Critical) | 0 | 0 | 0 |
| CVEs (High) | ≤2 with plan | 0 | 0 |
| Duplicated Lines | <5% | <3% | <3% |
| Maintainability | B or higher | A | A |
| Reliability | B or higher | A | A |
| Security | B or higher | A | A |

### Phase 12: Developer Workflow Integration
**Goal**: Show developers how quality metrics fit into daily work

**Tasks**:
- [ ] Document local quality check workflow
- [ ] List pre-commit quality commands
- [ ] Explain PR quality gate requirements
- [ ] Show how to view coverage reports locally
- [ ] Provide examples of interpreting SonarQube feedback
- [ ] Create quick reference guide for fixing common issues:
  - [ ] Low test coverage (write more tests)
  - [ ] Code duplication (refactor shared logic)
  - [ ] Security hotspots (review and resolve)
  - [ ] Code smells (simplify complexity)

**Deliverables**:
- Developer workflow section with commands and examples

**Example Workflow**:
```bash
# Local quality checks before committing
yarn lint:fix          # Fix linting issues
yarn test:coverage     # Verify test coverage
yarn db:migrate:dev    # Ensure migrations are clean

# View coverage report
open coverage/index.html

# Create PR with quality metrics automatically analyzed
```

### Phase 13: Troubleshooting and FAQ
**Goal**: Answer common questions about quality metrics

**Tasks**:
- [ ] Add FAQ section with common questions:
  - [ ] Coverage percentage differences (local vs CI)
  - [ ] Excluding generated code from analysis
  - [ ] Code smell vs bug definitions
  - [ ] Security hotspot exception requests
  - [ ] Page template duplication exclusions
- [ ] Provide troubleshooting steps for common issues
- [ ] Link to relevant team contacts or channels (if applicable)

**Deliverables**:
- FAQ section with practical answers

**Common Questions**:
- Why is my coverage lower in CI?
- How do I exclude files from SonarCloud?
- What's the difference between a bug and a code smell?
- How do I fix a security hotspot?

### Phase 14: References and Further Reading
**Goal**: Provide links to external resources and standards

**Tasks**:
- [ ] Add links to SonarQube documentation
- [ ] Link to OWASP Top 10
- [ ] Reference HMCTS service standards
- [ ] Link to GOV.UK service manual quality guidance
- [ ] Link to CLAUDE.md for development guidelines
- [ ] Add internal wiki or confluence pages (if applicable)

**Deliverables**:
- References section with external links

**Key References**:
- SonarQube Metric Definitions
- OWASP Top 10 2021
- HMCTS Service Standards
- GOV.UK Service Manual
- CLAUDE.md

### Phase 15: Review and Polish
**Goal**: Ensure document quality and accuracy

**Tasks**:
- [ ] Review document for completeness
- [ ] Verify all code examples are accurate
- [ ] Test all commands and links
- [ ] Ensure consistent formatting and style
- [ ] Check markdown rendering on GitHub
- [ ] Proofread for clarity and grammar
- [ ] Verify technical accuracy with team

**Deliverables**:
- Polished, production-ready documentation

**Review Checklist**:
- All sections complete
- Code examples tested
- Links working
- Formatting consistent
- No typos or grammar issues

### Phase 16: Team Review and Integration
**Goal**: Get team feedback and integrate documentation

**Tasks**:
- [ ] Share draft with development team
- [ ] Incorporate feedback from technical leads
- [ ] Validate examples with junior developers
- [ ] Adjust complexity level based on feedback
- [ ] Ensure alignment with team practices
- [ ] Add link to `docs/quality-metrics.md` from `README.md`
- [ ] Update CLAUDE.md to reference quality standards
- [ ] Add quality metrics section to onboarding documentation
- [ ] Create PR template checklist item for quality review

**Deliverables**:
- Team-reviewed documentation
- Integration with existing documentation

**Files to Update**:
- `README.md` (add link to quality metrics)
- `CLAUDE.md` (reference quality standards)

## File Changes Required

### New Files to Create

1. **`docs/quality-metrics.md`** (main deliverable)
   - Comprehensive quality metrics guide
   - All six metrics documented
   - VIBE pilot specific examples
   - Developer workflow integration
   - Troubleshooting and FAQ

2. **`docs/tickets/VIBE-188/plan.md`** (this file)
   - Technical implementation plan

### Files to Update

1. **`README.md`**
   - Add link to quality metrics documentation
   - Reference in "Documentation" or "Development" section

2. **`CLAUDE.md`** (optional)
   - Add reference to quality standards
   - Link to quality metrics guide

## Database Schema Changes

**None required** - This is a documentation task with no database changes.

## API Endpoints

**None required** - This is a documentation task with no API changes.

## Testing Strategy

### Documentation Quality Testing

**Technical Accuracy Review**:
- [ ] Verify all commands work as documented
- [ ] Test all code examples in actual codebase
- [ ] Validate SonarCloud dashboard links
- [ ] Confirm quality gate thresholds are accurate
- [ ] Review with technical lead for accuracy

**Clarity and Readability**:
- [ ] Junior developer review (is it understandable?)
- [ ] Mid-level developer review (is it useful?)
- [ ] Senior developer review (is it complete?)

**Link Validation**:
- [ ] Verify all external links work (SonarQube docs, OWASP, etc.)
- [ ] Verify all internal cross-references are correct
- [ ] Check code file references exist in codebase

**Format Testing**:
- [ ] Verify markdown renders correctly on GitHub
- [ ] Check table formatting
- [ ] Verify code block syntax highlighting
- [ ] Test anchor links for navigation

## Potential Risks and Mitigations

### Risk 1: Documentation Becomes Outdated
**Description**: Quality metrics, tools, or thresholds may change over time.

**Likelihood**: Medium (3)
**Impact**: Medium (3)
**Mitigation**:
- Add "Last Updated" date and version to document
- Establish quarterly review schedule
- Document ownership (assign maintainer)
- Include process for updating documentation

### Risk 2: Overly Technical for Junior Developers
**Description**: Content may be too complex for developers new to quality metrics.

**Likelihood**: Low (2)
**Impact**: Medium (3)
**Mitigation**:
- Use clear, simple language
- Provide examples for every concept
- Include glossary of terms
- Get junior developer feedback during review

### Risk 3: Insufficient Real-World Examples
**Description**: Generic examples may not help developers apply concepts to VIBE pilot.

**Likelihood**: Low (2)
**Impact**: High (4)
**Mitigation**:
- Use real code examples from VIBE codebase
- Reference actual files and line numbers
- Show before/after refactoring examples
- Link to actual PRs that improved quality

### Risk 4: Metrics Change Over Time
**Description**: SonarCloud, Vitest, or other tools may change their metric calculations.

**Likelihood**: Medium (3)
**Impact**: Low (2)
**Mitigation**:
- Link to official tool documentation (versioned)
- Document current tool versions
- Establish update schedule when tools are upgraded
- Keep metric definitions generic where possible

## Success Criteria

The quality metrics documentation is considered successful when:

1. **Documentation Complete**:
   - [ ] All six quality metrics fully documented
   - [ ] VIBE pilot specific examples included
   - [ ] Developer workflow integration described
   - [ ] Troubleshooting and FAQ sections complete
   - [ ] References and links provided

2. **Accuracy Validated**:
   - [ ] All commands tested and working
   - [ ] All code examples verified in codebase
   - [ ] All links working
   - [ ] Technical accuracy confirmed by team

3. **Team Approved**:
   - [ ] Technical lead review completed
   - [ ] Developer feedback incorporated
   - [ ] Clarity validated with junior developers
   - [ ] Alignment with team practices confirmed

4. **Integrated with Existing Docs**:
   - [ ] Linked from README.md
   - [ ] Referenced in CLAUDE.md (if appropriate)
   - [ ] Accessible from main documentation navigation

5. **Actionable and Practical**:
   - [ ] Developers can follow workflows independently
   - [ ] Quality issues can be understood and fixed
   - [ ] SonarCloud feedback can be interpreted
   - [ ] Clear "what good looks like" targets defined

## Timeline Estimate

**Phase 1: Research and Information Gathering** - 2-3 hours
- Review current metrics and configuration

**Phase 2: Document Structure Creation** - 30 minutes
- Create skeleton with table of contents

**Phase 3: Introduction and Overview** - 1 hour
- Write introduction section

**Phase 4-9: Core Content (Six Metrics)** - 6-8 hours
- 1-1.5 hours per metric (Test Coverage, CVEs, Duplication, Maintainability, Reliability, Security)

**Phase 10: VIBE Pilot Application** - 2-3 hours
- Map metrics to specific VIBE implementation

**Phase 11: Success Criteria** - 1 hour
- Define quality gates table

**Phase 12: Developer Workflow** - 2 hours
- Document integration with daily work

**Phase 13: Troubleshooting and FAQ** - 1-2 hours
- Common questions and answers

**Phase 14: References** - 30 minutes
- Add external links

**Phase 15: Review and Polish** - 1-2 hours
- Final review and formatting

**Phase 16: Team Review and Integration** - 2-3 hours
- Incorporate feedback and integrate with existing docs

**Total Estimated Time**: 19-26 hours (approximately 2.5-3.5 days)

## Dependencies

- Access to SonarCloud dashboard for VIBE pilot
- Understanding of current CI/CD pipeline
- Examples of quality issues from recent PRs
- Input from technical leads on quality targets
- Review time from development team

## Next Steps

1. Review this plan with technical lead for approval
2. Confirm SonarCloud access and current metrics
3. Begin Phase 1: Research and information gathering
4. Create document skeleton (Phase 2)
5. Start writing core content sections (Phases 3-9)
6. Schedule team review session for draft feedback

## References

- VIBE-188 Specification: `docs/tickets/VIBE-188/specification.md`
- VIBE-188 Tasks: `docs/tickets/VIBE-188/tasks.md`
- SonarCloud Project: (to be added during research phase)
- HMCTS Coding Standards: `CLAUDE.md`
- SonarQube Metric Definitions: https://docs.sonarsource.com/sonarqube/latest/user-guide/metric-definitions/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- GOV.UK Service Manual: https://www.gov.uk/service-manual
