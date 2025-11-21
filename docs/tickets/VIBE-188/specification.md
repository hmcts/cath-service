# VIBE-188: Educational Materials - Quality

## Overview

This specification outlines the creation of educational documentation that explains quality metrics, their application in the VIBE pilot, and success criteria for measuring code quality in HMCTS Express monorepo projects.

## Purpose

Create comprehensive documentation that helps development teams understand:
- What quality metrics are and why they matter
- How SonarQube/SonarCloud analyzes these metrics
- How these metrics apply specifically to the VIBE pilot project
- Clear success criteria for "what good looks like"
- Actionable guidance for improving quality metrics

## Target Audience

- HMCTS developers working on Express.js monorepo projects
- Technical leads evaluating code quality
- New team members onboarding to the VIBE pilot
- Product owners understanding technical quality gates

## Document Structure

### 1. Introduction to Quality Metrics

**Objective**: Explain the purpose and value of automated quality analysis.

**Content**:
- Why quality metrics matter for government services
- The relationship between code quality and service reliability
- How automated quality analysis fits into the development workflow
- Overview of SonarQube/SonarCloud as the quality analysis platform

### 2. Core Quality Metrics

For each metric, provide:
- Definition and purpose
- How it's measured
- Why it matters for government services
- Common issues and how to fix them

#### 2.1 Test Coverage

**Definition**: Percentage of code executed during automated tests

**Content**:
- How coverage is calculated (line coverage, branch coverage)
- Current target: >80% for business logic
- Tools used: Vitest with lcov reporter
- How coverage is tracked in CI/CD pipeline
- Exclusions: locales, migrations, generated code

#### 2.2 CVEs (Common Vulnerabilities and Exposures)

**Definition**: Known security vulnerabilities in dependencies

**Content**:
- What CVEs are and severity levels (Critical, High, Medium, Low)
- OSV Scanner integration for dependency scanning
- Scheduled daily scans in GitHub Actions
- Response procedures for different severity levels
- How to update vulnerable dependencies

#### 2.3 Duplicated Code

**Definition**: Code blocks that are repeated across the codebase

**Content**:
- Why duplication reduces maintainability
- SonarQube duplication detection threshold
- Acceptable duplication scenarios (e.g., page templates)
- Refactoring strategies for removing duplication
- Exclusions: apps/web/src/pages/*, libs/*/src/pages/*

#### 2.4 Maintainability

**Definition**: How easy it is to understand, modify, and extend the code

**Content**:
- SonarQube maintainability rating (A-E)
- Factors: technical debt, code smells, complexity
- Technical debt ratio calculation
- Common code smells in TypeScript/Express applications
- Best practices from CLAUDE.md (functional style, YAGNI, KISS)

#### 2.5 Reliability

**Definition**: The likelihood of the code functioning correctly without bugs

**Content**:
- SonarQube reliability rating (A-E)
- Bug detection and classification
- Common reliability issues in Node.js applications
- Error handling patterns (async/await, middleware)
- Testing strategies for improving reliability

#### 2.6 Security

**Definition**: Protection against security vulnerabilities and threats

**Content**:
- SonarQube security rating (A-E)
- Security hotspots and vulnerabilities
- OWASP Top 10 considerations
- Security best practices:
  - Input validation
  - Parameterized queries (Prisma)
  - Helmet.js security headers
  - Authentication/authorization middleware
  - Session security

### 3. VIBE Pilot Application

**Objective**: Map generic metrics to the specific VIBE pilot implementation.

**Content**:
- Current quality dashboard location (SonarCloud project)
- VIBE pilot quality baselines and targets
- Integration points:
  - GitHub Actions workflow (.github/workflows/test.yml)
  - SonarCloud configuration (sonar-project.properties)
  - Coverage collection (lcov-result-merger)
  - OSV Scanner configuration (.github/osv-scanner.toml)

**Project-Specific Examples**:
- Test coverage patterns in libs/onboarding
- Security middleware in libs/web-core
- Database query patterns in Prisma schemas
- Page template structure and duplication handling

### 4. Success Criteria: "What Good Looks Like"

**Objective**: Define clear, measurable targets for each metric.

**Quality Gates**:

| Metric | Minimum Standard | Target | VIBE Pilot Goal |
|--------|------------------|--------|-----------------|
| Test Coverage | 70% overall | 80% business logic | 85% by Q2 2025 |
| CVEs (Critical) | 0 | 0 | 0 |
| CVEs (High) | ≤2 with plan | 0 | 0 |
| Duplicated Lines | <5% | <3% | <3% |
| Maintainability | B or higher | A | A |
| Reliability | B or higher | A | A |
| Security | B or higher | A | A |

**Continuous Improvement**:
- Monthly quality reviews
- Quarterly metric baseline updates
- Integration with PR review process
- Automated quality gate enforcement

### 5. Developer Workflow Integration

**Objective**: Show developers how quality metrics fit into daily work.

**Content**:
- Pre-commit quality checks
- PR quality gate requirements
- How to view quality reports locally
- Interpreting SonarQube feedback in PRs
- Fixing common quality issues

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

### 6. Troubleshooting and FAQ

**Common Questions**:
- Why is my coverage percentage lower in CI than locally?
- How do I exclude generated code from analysis?
- What's the difference between a code smell and a bug?
- How do I request an exception for a security hotspot?
- Why are page templates excluded from duplication checks?

### 7. Further Reading

**References**:
- SonarQube metric definitions
- OWASP Top 10 security risks
- HMCTS service standards
- GOV.UK service manual quality guidance
- CLAUDE.md development guidelines

## Document Format

- Markdown format for easy GitHub rendering
- Clear section hierarchy with links
- Code examples and screenshots where helpful
- Tables for metric targets and comparisons
- Links to relevant configuration files in the codebase

## Location

`docs/quality-metrics.md` in the repository root

## Maintenance

- Review quarterly as metrics evolve
- Update targets based on team retrospectives
- Add new metrics as tooling expands
- Keep examples aligned with current codebase
