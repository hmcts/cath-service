# VIBE-98 Technical Plan: Deliver mitigations not covered by SOW030

## Overview

This ticket focuses on identifying and implementing AI governance mitigations that fall outside the scope of SOW030 (Statement of Work 030). While VIBE-97 handles embedding mitigations into SOW030, VIBE-98 addresses HMCTS-specific implementations like AI code-review policies and service-level controls that are unique to CATH and not covered by the broader SOW030 framework.

## Technical Approach

### Separation of Concerns

**SOW030 Coverage (handled by VIBE-97):**
- Broad AI governance frameworks applicable across HMCTS
- Standard mitigation strategies embedded in SOW030 work streams
- Cross-department policies and procedures

**VIBE-98 Coverage (this ticket):**
- CATH service-specific implementations
- AI code review policies tailored to development workflows
- Service-level risk controls and monitoring
- HMCTS-specific compliance requirements not in SOW030
- Implementation status assessment of existing controls

### Documentation Strategy

This is a **documentation and assessment task** with the following deliverables:

1. **Gap Analysis Document**: Comprehensive mapping of CATH requirements against SOW030 coverage
2. **CATH-Specific Mitigation Register**: Policies and controls unique to this service
3. **Implementation Status Report**: Current state assessment with evidence
4. **Policy Documentation**: Formal policies (AI code review, audit processes)
5. **Implementation Roadmap**: Prioritized delivery plan with timelines and owners

## Implementation Phases

### Phase 1: Gap Analysis and Discovery
**Goal**: Identify all mitigations not covered by SOW030

**Tasks**:
- [ ] Obtain complete SOW030 documentation and coverage mapping
- [ ] Review VIBE-95 risk register for mitigation requirements
- [ ] List all CATH governance requirements from AI Steering Group
- [ ] Create coverage matrix: CATH requirements vs SOW030 streams
- [ ] Identify gaps requiring CATH-specific solutions
- [ ] Categorize gaps by risk level (Critical/High/Medium/Low)
- [ ] Assess implementation complexity for each gap (Simple/Moderate/Complex)
- [ ] Validate gap analysis with governance stakeholders

**Deliverables**:
- Gap analysis matrix (Excel/Markdown table)
- Categorized list of CATH-specific mitigations
- Risk assessment for each gap
- Stakeholder validation sign-off

**Files Affected**:
- `docs/tickets/VIBE-98/gap-analysis.md` (new)
- `docs/tickets/VIBE-98/sow030-coverage-matrix.xlsx` (new)

**Timeline**: 3-5 days

### Phase 2: Current State Assessment
**Goal**: Understand what's already implemented at HMCTS

**Tasks**:
- [ ] Audit existing HMCTS AI governance documentation
- [ ] Review CATH repository for implemented controls:
  - `.github/workflows/` - CI/CD security controls
  - `CLAUDE.md` - AI tool usage guidelines
  - Code review practices in pull requests
  - Security scanning tools configuration
- [ ] Interview development team on current practices
- [ ] Interview security team on HMCTS-wide controls
- [ ] Document implementation status for each mitigation:
  - Complete (with evidence)
  - Partial (with gaps identified)
  - Not Started (with priority assessment)
- [ ] Gather evidence artifacts (policies, configs, logs)
- [ ] Create implementation status baseline report

**Deliverables**:
- Implementation status report with evidence
- List of existing controls and their effectiveness
- Identified gaps in current implementations
- Recommendations for improvements

**Files Affected**:
- `docs/tickets/VIBE-98/current-state-assessment.md` (new)
- `docs/tickets/VIBE-98/evidence/` folder (new, for artifacts)

**Timeline**: 4-6 days

### Phase 3: CATH-Specific Mitigation Definition
**Goal**: Define mitigations unique to CATH service

**Tasks**:
- [ ] Define AI Code Review Policy (primary deliverable)
  - Scope: When AI-assisted code requires review
  - Review criteria: What to check in AI-generated code
  - Review process: Who reviews, approval chain
  - Tooling: Automated checks, manual review checklist
  - Documentation: Commit messages, PR templates
- [ ] Define Service-Level Risk Controls
  - Input validation for AI interactions
  - Output validation and sanitization
  - Rate limiting and abuse prevention
  - Logging and audit trail requirements
- [ ] Define HMCTS-Specific Governance Requirements
  - Data handling policies for AI tools
  - PII protection in AI context
  - Third-party AI service vetting
  - Incident response for AI-related issues
- [ ] Define CATH Compliance Obligations
  - GDPR compliance for AI processing
  - Government Service Standard alignment
  - WCAG accessibility requirements
  - Security classification requirements
- [ ] Define Audit and Accountability Mechanisms
  - AI usage tracking and reporting
  - Code provenance tracking
  - Compliance verification process
  - Exception handling and escalation

**Deliverables**:
- AI Code Review Policy document
- Service-level risk controls specification
- HMCTS governance requirements document
- Compliance requirements checklist
- Audit and accountability framework

**Files Affected**:
- `docs/tickets/VIBE-98/ai-code-review-policy.md` (new)
- `docs/tickets/VIBE-98/service-risk-controls.md` (new)
- `docs/tickets/VIBE-98/hmcts-governance-requirements.md` (new)
- `docs/tickets/VIBE-98/compliance-obligations.md` (new)
- `docs/tickets/VIBE-98/audit-framework.md` (new)

**Timeline**: 5-7 days

### Phase 4: Policy Documentation
**Goal**: Create formal, actionable policy documents

**Tasks**:

#### AI Code Review Policy
- [ ] Define policy scope and applicability
  - Which code requires review (all AI-assisted? Only certain components?)
  - Exemptions and exceptions
- [ ] Establish review criteria and standards
  - Security checklist (injection, XSS, authentication)
  - Quality checklist (readability, maintainability, testing)
  - Compliance checklist (GDPR, accessibility, standards)
- [ ] Document review process
  - Pre-review: Developer self-assessment
  - Review: Peer review requirements
  - Approval: Who can approve AI-assisted code
  - Post-review: Follow-up and verification
- [ ] Create reviewer qualification requirements
  - Technical skills required
  - Security awareness training
  - AI tool familiarity
- [ ] Establish timelines and SLAs
  - Review turnaround time
  - Escalation procedures for delays
  - Emergency review process

#### Governance Control Documentation
- [ ] Document each CATH-specific control
  - Control objective
  - Control description
  - Implementation approach
  - Verification method
- [ ] Define ownership and accountability
  - Control owner (responsible for effectiveness)
  - Control operator (day-to-day operation)
  - Control reviewer (independent verification)
- [ ] Establish measurement and verification
  - Key metrics for each control
  - Monitoring approach
  - Reporting cadence
- [ ] Create implementation guides
  - Step-by-step setup instructions
  - Configuration examples
  - Troubleshooting guidance
- [ ] Link to risk registry (VIBE-95)
  - Map controls to risks they mitigate
  - Reference risk scores and priorities

#### Compliance Requirements
- [ ] Map HMCTS obligations to mitigations
  - Legal requirements (GDPR, etc.)
  - Policy requirements (HMCTS standards)
  - Contractual requirements (SOW030)
- [ ] Document audit evidence requirements
  - What evidence demonstrates compliance
  - Where evidence is stored
  - How long evidence is retained
- [ ] Establish reporting and monitoring cadence
  - Daily: Automated monitoring alerts
  - Weekly: Compliance metrics dashboard
  - Monthly: Compliance status report
  - Quarterly: Comprehensive audit
- [ ] Create compliance checklist
  - Pre-release compliance verification
  - Post-release compliance monitoring
  - Incident response compliance
- [ ] Define exception handling process
  - How to request exceptions
  - Approval authority for exceptions
  - Time-limited exception management
  - Exception audit trail

**Deliverables**:
- Formal AI Code Review Policy v1.0
- Control documentation for each CATH-specific control
- Compliance requirements document with evidence requirements
- Implementation guides for all policies
- Integration with existing HMCTS processes

**Files Affected**:
- `docs/tickets/VIBE-98/policies/ai-code-review-policy-v1.0.md` (new)
- `docs/tickets/VIBE-98/policies/governance-controls.md` (new)
- `docs/tickets/VIBE-98/policies/compliance-requirements.md` (new)
- `docs/tickets/VIBE-98/guides/control-implementation-guide.md` (new)
- `CLAUDE.md` (update with policy references)

**Timeline**: 6-8 days

### Phase 5: Implementation Planning
**Goal**: Create actionable roadmap for delivering mitigations

**Tasks**:

#### Prioritization
- [ ] Score each mitigation by risk reduction potential
  - Critical: Addresses high-severity risk
  - High: Addresses medium-severity risk or multiple low risks
  - Medium: Addresses low-severity risk or enhances existing control
  - Low: Nice-to-have improvement
- [ ] Score each mitigation by implementation effort
  - Simple: < 2 days, no dependencies
  - Moderate: 2-5 days, minimal dependencies
  - Complex: > 5 days, significant dependencies or technical challenges
- [ ] Calculate priority score (risk reduction / effort)
- [ ] Review prioritization with stakeholders
- [ ] Adjust based on business priorities and constraints

#### Roadmap Development
- [ ] Sequence mitigations by dependencies
  - Foundation items first (e.g., policy framework)
  - Building blocks second (e.g., tooling setup)
  - Advanced capabilities last (e.g., automated enforcement)
- [ ] Assign ownership for each mitigation
  - Primary owner (accountable for delivery)
  - Contributors (support delivery)
  - Reviewer (validates completion)
- [ ] Establish delivery timeline
  - Align with SOW030 milestones
  - Consider team capacity and competing priorities
  - Build in buffer for delays and dependencies
- [ ] Identify resource requirements
  - Developer time
  - Security team support
  - Tool licenses or infrastructure
  - Training or documentation time
- [ ] Create implementation checklist for each mitigation
  - Development tasks
  - Testing and validation tasks
  - Documentation tasks
  - Stakeholder communication tasks
  - Success criteria and acceptance tests

#### Stakeholder Communication
- [ ] Prepare gap analysis presentation for governance leads
  - Executive summary of findings
  - Key gaps and their risk implications
  - Proposed mitigation approach
  - Resource requirements and timeline
- [ ] Present to HMCTS leadership for validation
  - Align on priorities and constraints
  - Confirm resource availability
  - Get approval for approach
- [ ] Align timeline with AI Steering Group expectations
  - Present roadmap to AI Steering Group
  - Address concerns and feedback
  - Adjust timeline based on group input
- [ ] Document decisions and rationale
  - Record all prioritization decisions
  - Capture stakeholder feedback
  - Document any trade-offs or compromises
- [ ] Establish governance for roadmap changes
  - Change request process
  - Approval authority for changes
  - Communication protocol for changes

**Deliverables**:
- Prioritized mitigation backlog with scores
- Implementation roadmap with timeline and dependencies
- Resource allocation plan
- Stakeholder presentation materials
- Approved roadmap with sign-off

**Files Affected**:
- `docs/tickets/VIBE-98/implementation-roadmap.md` (new)
- `docs/tickets/VIBE-98/mitigation-prioritization.xlsx` (new)
- `docs/tickets/VIBE-98/stakeholder-presentation.pdf` (new)
- `docs/tickets/VIBE-98/resource-plan.md` (new)

**Timeline**: 4-6 days

### Phase 6: Integration and Launch
**Goal**: Integrate policies into workflows and begin implementation

**Tasks**:
- [ ] Update `CLAUDE.md` with policy references
  - Link to AI Code Review Policy
  - Reference governance controls
  - Highlight compliance requirements
- [ ] Create PR template for AI-assisted code
  - Checklist for AI code review requirements
  - Section for documenting AI tool usage
  - Link to review policy
- [ ] Configure GitHub Actions for automated checks
  - Security scanning (CodeQL, Semgrep)
  - Dependency scanning (npm audit, Snyk)
  - Compliance validation (custom checks)
- [ ] Update team documentation
  - Add AI governance section to team wiki
  - Link policies from README
  - Create quick reference guides
- [ ] Conduct team training session
  - Overview of new policies
  - Walkthrough of review process
  - Q&A and feedback
- [ ] Establish monitoring and reporting
  - Set up metrics dashboard
  - Configure alerting for policy violations
  - Establish reporting schedule
- [ ] Begin implementation of high-priority mitigations
  - Start with foundation items
  - Track progress against roadmap
  - Report status to stakeholders

**Deliverables**:
- Updated `CLAUDE.md` with policy integration
- PR template for AI-assisted code
- Configured CI/CD security controls
- Team training materials and session completion
- Monitoring dashboard and alerting
- First mitigations implemented

**Files Affected**:
- `CLAUDE.md` (update)
- `.github/pull_request_template.md` (update or create)
- `.github/workflows/security-checks.yml` (update or create)
- `docs/ai-governance/` (new folder)
- `docs/ai-governance/quick-reference.md` (new)
- `docs/tickets/VIBE-98/training-materials.pdf` (new)

**Timeline**: 5-7 days

## File Changes Summary

### New Files to Create

1. **Gap Analysis Documents**
   - `docs/tickets/VIBE-98/gap-analysis.md` - Comprehensive gap analysis
   - `docs/tickets/VIBE-98/sow030-coverage-matrix.xlsx` - Coverage mapping

2. **Assessment Documents**
   - `docs/tickets/VIBE-98/current-state-assessment.md` - Implementation status
   - `docs/tickets/VIBE-98/evidence/` - Folder for evidence artifacts

3. **Policy Documents**
   - `docs/tickets/VIBE-98/policies/ai-code-review-policy-v1.0.md` - Primary policy
   - `docs/tickets/VIBE-98/policies/governance-controls.md` - Control documentation
   - `docs/tickets/VIBE-98/policies/compliance-requirements.md` - Compliance mapping

4. **Implementation Guides**
   - `docs/tickets/VIBE-98/guides/control-implementation-guide.md` - Setup guides
   - `docs/tickets/VIBE-98/implementation-roadmap.md` - Delivery plan
   - `docs/tickets/VIBE-98/resource-plan.md` - Resource allocation

5. **Supporting Documents**
   - `docs/tickets/VIBE-98/mitigation-prioritization.xlsx` - Prioritization matrix
   - `docs/tickets/VIBE-98/stakeholder-presentation.pdf` - Presentation materials
   - `docs/tickets/VIBE-98/training-materials.pdf` - Team training content

6. **Operational Documents**
   - `docs/ai-governance/quick-reference.md` - Quick reference for developers
   - `docs/ai-governance/review-checklist.md` - Code review checklist

### Files to Update

1. **`CLAUDE.md`**
   - Add AI Code Review Policy reference
   - Link to governance controls
   - Reference compliance requirements
   - Add quick reference section

2. **`.github/pull_request_template.md`**
   - Add AI-assisted code checklist
   - Link to review policy
   - Add section for documenting AI usage

3. **`.github/workflows/security-checks.yml`** (create if doesn't exist)
   - Add CodeQL security scanning
   - Add dependency scanning
   - Add custom compliance checks

4. **`README.md`** (potentially)
   - Link to AI governance documentation
   - Reference key policies

## AI Code Review Policy - Draft Outline

### 1. Policy Overview
- **Purpose**: Ensure AI-assisted code meets HMCTS quality, security, and compliance standards
- **Scope**: All code contributions using AI assistance (Claude Code, GitHub Copilot, etc.)
- **Effective Date**: TBD
- **Version**: 1.0

### 2. When Review is Required
- All production code commits using AI assistance
- Security-sensitive components (authentication, authorization, data handling)
- Public-facing interfaces (APIs, web pages)
- Database schema changes
- Configuration changes affecting security or compliance

### 3. Review Criteria

**Security**:
- Input validation and sanitization
- Output encoding and XSS prevention
- Authentication and authorization checks
- SQL injection prevention (parameterized queries)
- Secure handling of sensitive data

**Quality**:
- Code readability and maintainability
- Test coverage for business logic
- Error handling and logging
- Performance considerations
- Adherence to HMCTS coding standards (CLAUDE.md)

**Compliance**:
- GDPR compliance for data processing
- WCAG 2.2 AA accessibility standards
- Government Service Standard alignment
- GOV.UK Design System usage (frontend)
- Secure coding practices

### 4. Review Process
1. **Developer Self-Review**: Complete checklist before requesting review
2. **Peer Review**: Another developer reviews code using policy criteria
3. **Security Review** (conditional): Required for security-sensitive changes
4. **Approval**: Code owner or tech lead approves merge
5. **Documentation**: AI usage documented in commit message and PR

### 5. Reviewer Qualifications
- Completed HMCTS security awareness training
- Familiar with HMCTS coding standards
- Experience with relevant technology stack
- Understanding of AI tool capabilities and limitations

### 6. Timelines
- Standard review: 2 business days
- Security review: 3 business days
- Emergency review: Same day (with post-review audit)

### 7. Documentation Requirements
- Commit messages include: "AI-assisted with [tool name]"
- PR description documents: What AI helped with, what was modified
- Code comments explain: Complex logic or security decisions

### 8. Exceptions
- Emergency hotfixes (with mandatory post-review)
- Documentation-only changes
- Test-only changes (unless security tests)
- Request exception via standard process

## Database Schema Changes

**None required** - This is a documentation and process implementation task.

## API Endpoints

**None required** - This is a documentation and process implementation task.

## Testing Strategy

### Document Quality Testing
- [ ] Technical accuracy review by technical lead
- [ ] Security review by HMCTS security team
- [ ] Legal/compliance review for GDPR and regulatory sections
- [ ] Clarity review by development team
- [ ] Management review for stakeholder alignment

### Policy Validation Testing
- [ ] Pilot AI code review process with 3-5 PRs
- [ ] Collect feedback from reviewers and developers
- [ ] Measure review time and identify bottlenecks
- [ ] Validate checklist completeness
- [ ] Test exception process

### Integration Testing
- [ ] Verify CLAUDE.md links work correctly
- [ ] Test PR template renders properly
- [ ] Validate CI/CD security checks run successfully
- [ ] Test alerting for policy violations
- [ ] Verify metrics dashboard displays correctly

## Potential Risks and Mitigations

### Risk 1: Incomplete Gap Analysis
**Description**: SOW030 coverage may be misunderstood, leading to duplicate efforts or missed gaps.

**Likelihood**: Medium (3)
**Impact**: Medium (3)
**Mitigation**:
- Obtain official SOW030 documentation from governance team
- Validate gap analysis with both SOW030 leads and CATH stakeholders
- Use multiple sources (documentation, interviews, meetings) to verify coverage
- Schedule review session with SOW030 delivery team

### Risk 2: Policy Overhead
**Description**: New policies may add too much overhead to development workflow, reducing productivity.

**Likelihood**: Medium (3)
**Impact**: Medium (3)
**Mitigation**:
- Keep policies pragmatic and focused on high-risk areas
- Automate checks where possible (CI/CD)
- Provide clear guidance and examples
- Pilot policies with small team before full rollout
- Regularly review and streamline based on feedback
- Establish clear exception process for edge cases

### Risk 3: Stakeholder Misalignment
**Description**: Different stakeholders (SOW030 team, AI Steering Group, HMCTS leadership) may have conflicting priorities or expectations.

**Likelihood**: Medium (3)
**Impact**: High (4)
**Mitigation**:
- Engage all stakeholders early in gap analysis phase
- Document and communicate priorities and trade-offs clearly
- Establish clear governance for resolving conflicts
- Regular status updates to all stakeholder groups
- Escalate conflicts promptly to appropriate decision-makers

### Risk 4: Implementation Delays
**Description**: Mitigation implementation may be delayed by dependencies, resource constraints, or competing priorities.

**Likelihood**: High (4)
**Impact**: Medium (3)
**Mitigation**:
- Build buffer time into roadmap
- Identify and track dependencies proactively
- Secure resource commitments upfront
- Prioritize mitigations to deliver high-value items first
- Have contingency plans for resource shortfalls
- Regular status reporting and early warning of risks

### Risk 5: Policy Non-Compliance
**Description**: Team may not follow new policies due to lack of awareness, training, or tooling support.

**Likelihood**: Medium (3)
**Impact**: High (4)
**Mitigation**:
- Comprehensive team training before policy enforcement
- Provide easy-to-use tools and templates
- Automate compliance checks where possible
- Make policies easily accessible (linked from CLAUDE.md)
- Monitor compliance metrics and address gaps quickly
- Establish clear escalation for compliance issues

## Success Criteria

1. **Gap Analysis Complete**:
   - [ ] SOW030 coverage documented and validated
   - [ ] All CATH-specific gaps identified and categorized
   - [ ] Gap analysis approved by governance stakeholders
   - [ ] No critical governance gaps unaddressed

2. **Current State Documented**:
   - [ ] Implementation status assessed for all mitigations
   - [ ] Evidence gathered for existing controls
   - [ ] Gaps in current implementations identified
   - [ ] Baseline metrics established

3. **Policies Documented**:
   - [ ] AI Code Review Policy v1.0 complete and approved
   - [ ] At least 3 other key policies documented
   - [ ] All policies reviewed by legal/compliance
   - [ ] Policies integrated into team workflows

4. **Implementation Roadmap Approved**:
   - [ ] All mitigations prioritized with scores
   - [ ] Dependencies identified and sequenced
   - [ ] Owners assigned for each mitigation
   - [ ] Timeline aligned with SOW030 and AI Steering Group expectations
   - [ ] Resource requirements identified and committed
   - [ ] Roadmap approved by all key stakeholders

5. **Integration Complete**:
   - [ ] CLAUDE.md updated with policy references
   - [ ] PR template includes AI code review checklist
   - [ ] CI/CD security checks configured
   - [ ] Team trained on new policies
   - [ ] Monitoring and reporting established

6. **Stakeholder Buy-In**:
   - [ ] Governance leads approve approach
   - [ ] HMCTS leadership signs off on roadmap
   - [ ] AI Steering Group validates timeline
   - [ ] Development team understands and supports policies

## Timeline Estimate

**Phase 1: Gap Analysis** - 3-5 days
- SOW030 documentation review
- CATH requirements analysis
- Gap identification and validation

**Phase 2: Current State Assessment** - 4-6 days
- HMCTS governance audit
- CATH implementation review
- Evidence gathering and baseline creation

**Phase 3: CATH-Specific Mitigation Definition** - 5-7 days
- AI Code Review Policy definition
- Service-level controls definition
- Governance and compliance requirements documentation

**Phase 4: Policy Documentation** - 6-8 days
- Formal policy writing
- Control documentation
- Implementation guide creation

**Phase 5: Implementation Planning** - 4-6 days
- Prioritization and roadmap development
- Stakeholder presentations and approval

**Phase 6: Integration and Launch** - 5-7 days
- Workflow integration
- Team training
- Initial implementation

**Total Estimated Time**: 27-39 days (approximately 5-8 weeks)

**Note**: Phases 1-2 can partially overlap. Phases 3-4 can partially overlap. Phase 5 depends on phases 1-4 completion. Phase 6 begins after phase 5 approval.

## Dependencies

**External Dependencies**:
- SOW030 documentation and coverage mapping from governance team
- HMCTS AI governance documentation access
- Stakeholder availability for interviews and approvals
- Security team availability for reviews
- Legal/compliance team availability for policy review

**Internal Dependencies**:
- VIBE-95 risk register completion (provides risk context)
- VIBE-97 progress (to understand what's covered by SOW030)
- Access to existing HMCTS policies and standards
- Development team availability for current state interviews

**Technical Dependencies**:
- GitHub Actions access for CI/CD configuration
- Security scanning tool licenses (CodeQL, Snyk, etc.)
- Monitoring/dashboard tooling

## Key Deliverables Summary

1. **Gap Analysis Document** - Maps CATH requirements vs SOW030 coverage
2. **Current State Assessment Report** - Documents what's implemented today
3. **AI Code Review Policy v1.0** - Primary policy document for the service
4. **Governance Controls Documentation** - CATH-specific control specifications
5. **Compliance Requirements Document** - Mapping of HMCTS obligations to mitigations
6. **Implementation Roadmap** - Prioritized, sequenced delivery plan with owners and timelines
7. **Integrated Workflows** - Updated CLAUDE.md, PR templates, CI/CD checks
8. **Training Materials** - Team enablement for new policies

## Next Steps

1. Review this plan with Jon Machtynger (ticket assignee) for approval
2. Obtain SOW030 documentation from governance team
3. Schedule kickoff meeting with key stakeholders
4. Begin Phase 1: Gap Analysis and Discovery
5. Set up documentation structure in `docs/tickets/VIBE-98/`
6. Create tracking mechanism for tasks (JIRA sub-tasks or checklist)

## References

- **VIBE-98 Specification**: `docs/tickets/VIBE-98/specification.md`
- **VIBE-98 Tasks**: `docs/tickets/VIBE-98/tasks.md`
- **VIBE-95 Risk Register**: Related risk documentation
- **VIBE-97**: SOW030 embedding (complementary ticket)
- **HMCTS Coding Standards**: `CLAUDE.md`
- **Government Service Standard**: https://www.gov.uk/service-manual/service-standard
- **UK GDPR**: https://ico.org.uk/for-organisations/guide-to-data-protection/
