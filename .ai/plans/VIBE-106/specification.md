# VIBE-106: Provide a list of relevant artefacts - Specification

## Problem Statement
Provide a list of relevant artefacts to relevant groups (AI Steering Group, SharePoint, Confluence etc.).

## User Story
**AS A** Project Manager
**I WANT** to create and maintain a comprehensive list of project artefacts
**SO THAT** stakeholders can easily find and access relevant documentation and outputs

## Acceptance Criteria
- [ ] Complete inventory of all project artefacts created
- [ ] Artefacts categorized by type and audience
- [ ] Location/links provided for each artefact
- [ ] Ownership and maintenance responsibility assigned
- [ ] Distribution list created showing which groups need which artefacts
- [ ] Artefacts published to appropriate locations (SharePoint, Confluence)
- [ ] Stakeholder groups notified of artefact availability
- [ ] Master artefact register maintained and kept current

## Technical Context
This ticket creates a central reference document listing all project outputs, documentation, and deliverables with links to their locations. This serves as a navigation aid and ensures all stakeholders know what exists and where to find it.

## Artefact Categories

### 1. Governance and Planning
- Project charter/mandate
- Risks register (VIBE-95)
- Mitigations register (VIBE-96)
- SOW030 collaboration plan (VIBE-97)
- Milestone meeting materials (VIBE-100)
- Decision log
- Action tracker

### 2. Evidence and Research
- KPI04 evidential pack (VIBE-99)
- Academic research summaries
- Market research reports
- Benchmarking data
- Lessons learned

### 3. Policies and Standards
- AI code-review policy (VIBE-98)
- AI usage guidelines
- Quality standards
- Security requirements
- Compliance documentation

### 4. Training and Education
- Educational materials - satisfaction & trust (VIBE-187)
- Educational materials - quality (VIBE-188)
- Educational materials - efficiency (VIBE-189)
- Developer training guides
- Best practices documentation
- FAQ documents

### 5. Technical Documentation
- Architecture diagrams
- Integration specifications
- API documentation
- Configuration guides
- Deployment procedures

### 6. Reports and Dashboards
- Project status reports
- Metrics dashboards
- Progress trackers
- Issue logs
- Audit reports

### 7. Communications
- Stakeholder communications
- Meeting minutes
- Announcements
- Newsletters
- Presentations

## Stakeholder Groups and Access Needs

### AI Steering Group
- Executive summaries
- Risks and mitigations register
- KPI04 evidence pack
- Milestone presentations
- Decision log
- High-level dashboards

### Project Team
- All technical documentation
- Detailed plans and trackers
- Development guidelines
- Training materials
- Issue logs

### Development Teams
- AI usage policies
- Code review guidelines
- Best practices
- Training materials
- Technical documentation

### Leadership/Management
- Executive summaries
- Status reports
- ROI and benefits documentation
- Risk summaries
- Key decisions

### Broader Organization
- Educational materials
- Policy summaries
- Success stories
- FAQ documents

## Artefact Register Format

For each artefact, document:
- **Name**: Clear, descriptive title
- **Description**: Brief summary of content
- **Type**: Category (e.g., Policy, Report, Training)
- **Owner**: Person responsible for maintenance
- **Location**: SharePoint/Confluence link
- **Audience**: Who should access this
- **Status**: Draft, Review, Approved, Published
- **Last Updated**: Date of last modification
- **Review Frequency**: How often to update

## Distribution Matrix

```
| Artefact | AI Steering | Project Team | Dev Teams | Leadership | Organization |
|----------|-------------|--------------|-----------|------------|--------------|
| Risks Register | ✓ | ✓ | Summary | ✓ | - |
| KPI04 Pack | ✓ | ✓ | - | ✓ | Summary |
| AI Policy | ✓ | ✓ | ✓ | Summary | Summary |
| Training Materials | - | ✓ | ✓ | - | ✓ |
```

## Publication Strategy

### SharePoint
- Governance and official documents
- Risks and mitigations
- Policies and standards
- Executive materials

### Confluence
- Technical documentation
- Working documents and drafts
- Collaborative materials
- How-to guides

### Other Platforms
- Training materials: Learning management system
- Code documentation: GitHub repository
- Dashboards: Power BI or similar

## Out of Scope
- Creating the actual artefacts (covered by other tickets)
- Detailed content within artefacts
- Long-term maintenance processes (beyond initial setup)

## Dependencies
- All project artefacts must be created before they can be listed
- Access to SharePoint and Confluence
- Permissions to publish to relevant locations
- Stakeholder contact lists
