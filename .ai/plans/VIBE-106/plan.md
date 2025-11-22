# VIBE-106: Provide a list of relevant artefacts - Implementation Plan

## Summary
Create and maintain a comprehensive artefacts register listing all project outputs with locations, audiences, and ownership, distributed to relevant stakeholder groups through appropriate platforms.

## Key Implementation Points

### Phase 1: Inventory and Cataloging (3 days)
1. **Identify all artefacts** (1 day):
   - Review all project tickets (VIBE-95 through VIBE-189)
   - List deliverables from each ticket
   - Identify existing documentation
   - Note planned artefacts not yet created
   - Check for informal documents or outputs

2. **Categorize artefacts** (0.5 days):
   - Group by type (governance, policy, training, technical, etc.)
   - Tag by audience (steering group, dev teams, leadership, etc.)
   - Assign priority (critical, important, nice-to-have)
   - Note interdependencies

3. **Document current locations** (0.5 days):
   - Find where each artefact currently exists
   - Record SharePoint/Confluence/GitHub links
   - Note if location is appropriate
   - Identify gaps or misplaced items

4. **Create master register** (1 day):
   - Build comprehensive spreadsheet or database
   - Include all metadata (name, description, type, owner, location, audience, status, dates)
   - Add filtering and sorting capabilities
   - Create summary views for different audiences

### Phase 2: Ownership and Maintenance (1 day)
1. **Assign owners** (0.5 days):
   - Identify appropriate owner for each artefact
   - Confirm with owners they accept responsibility
   - Document backup/deputy owners
   - Clarify ownership responsibilities

2. **Define maintenance approach** (0.5 days):
   - Set review frequency for each artefact
   - Create update process
   - Establish version control approach
   - Define archival/retirement criteria

### Phase 3: Organization and Publishing (3 days)
1. **Organize locations** (1 day):
   - Create appropriate folder structures in SharePoint
   - Set up Confluence spaces
   - Establish naming conventions
   - Configure permissions and access rights

2. **Move or publish artefacts** (1.5 days):
   - Upload documents to correct locations
   - Update any existing links
   - Ensure proper permissions
   - Verify accessibility
   - Test links and downloads

3. **Create navigation aids** (0.5 days):
   - Build "hub" page with links to key artefacts
   - Create quick reference guide
   - Add to project homepage/portal
   - Include in relevant wikis

### Phase 4: Distribution Matrix (1 day)
1. **Define stakeholder groups** (0.5 days):
   - List all relevant groups
   - Identify key contacts for each
   - Determine distribution preferences
   - Document escalation contacts

2. **Create distribution matrix** (0.5 days):
   - Map artefacts to stakeholder groups
   - Specify full access vs. summary only
   - Note communication preferences
   - Schedule distribution timing

### Phase 5: Communication and Rollout (2 days)
1. **Prepare communications** (0.5 days):
   - Draft email/announcement
   - Create overview presentation
   - Prepare FAQ document
   - Design visual guide/infographic

2. **Distribute to stakeholder groups** (1 day):
   - **AI Steering Group**:
     - Email with executive summary
     - Link to relevant documents folder
     - Highlight key artefacts for their review

   - **Project Team**:
     - Team meeting presentation
     - Full access to all artefacts
     - Training on navigation

   - **Development Teams**:
     - Targeted communication on policies and guides
     - Links to relevant technical docs
     - Integration with existing workflows

   - **Leadership/Management**:
     - Executive summary email
     - Dashboard links
     - High-level documentation access

   - **Broader Organization**:
     - Intranet announcement
     - Links to public/educational materials
     - Overview of project outputs

3. **Gather feedback** (0.5 days):
   - Monitor questions and issues
   - Survey stakeholders on usefulness
   - Identify gaps or confusion
   - Refine based on feedback

### Phase 6: Ongoing Maintenance (Ongoing)
1. **Regular updates** (1 hour/week):
   - Add new artefacts as created
   - Update links if locations change
   - Mark artefacts as updated
   - Archive obsolete items

2. **Quarterly reviews** (2 hours/quarter):
   - Verify all links still work
   - Check ownership assignments
   - Update audience needs
   - Refresh communication

3. **Respond to requests** (as needed):
   - Help stakeholders find documents
   - Clarify access or permissions
   - Update register based on feedback

## Technical Decisions

**Format**: Spreadsheet for artefact register provides flexibility and accessibility; supplement with visual hub page for navigation.

**Permissions**: Balance open access with appropriate confidentiality; most artefacts should be findable but some restricted.

**Versioning**: Use platform native versioning (SharePoint, Confluence) rather than manual version numbers where possible.

**Communication**: Push initial notification, then pull-based access via hub page; avoid email overload.

## Example Artefact Register Entry

| Field | Value |
|-------|-------|
| **Name** | VIBE Coding Risks and Mitigations Register |
| **Description** | Comprehensive list of project risks with mitigation strategies, owners, and status |
| **Type** | Governance |
| **Owner** | Jon Machtynger |
| **Location** | [SharePoint Link] |
| **Audience** | AI Steering Group, Project Team, Leadership |
| **Status** | Published |
| **Last Updated** | 2025-10-15 |
| **Review Frequency** | Fortnightly |
| **Related Artefacts** | VIBE-95, VIBE-96, VIBE-100 |

## Example Hub Page Structure

```
VIBE Project Artefacts Hub

Quick Links:
├── For AI Steering Group
│   ├── Executive Dashboards
│   ├── Risks & Mitigations Register
│   ├── KPI04 Evidence Pack
│   └── Milestone Presentations
├── For Development Teams
│   ├── AI Code Review Policy
│   ├── Usage Guidelines
│   ├── Training Materials
│   └── Best Practices
├── For Project Team
│   ├── All Project Documentation
│   ├── Plans and Trackers
│   ├── Meeting Notes
│   └── Technical Specs
└── Complete Artefacts Register
    └── [Link to full spreadsheet]
```

## Example Communication

**Subject**: VIBE Project Artefacts Now Available

Dear [Stakeholder Group],

The VIBE project has created a comprehensive library of documentation and outputs that may be relevant to you. To help you find what you need, we've created an artefacts register and hub page.

**Key Resources for [Your Group]:**
- [Artefact 1 with link]
- [Artefact 2 with link]
- [Artefact 3 with link]

**Full Artefacts Hub**: [Link]

For questions or to request access, contact [Project Lead].

Regards,
VIBE Project Team

## Resource Requirements
- Project lead: 5 days for initial setup
- Project coordinator: 3 days for organization and publishing
- IT support: 1 day for permissions and structure setup
- Ongoing: 1 hour/week for maintenance

## Dependencies
- Artefacts must exist before they can be listed
- Access to SharePoint and Confluence with admin rights
- Stakeholder contact lists
- Approval to publish to shared locations

## Definition of Done
- [ ] Complete inventory of all project artefacts
- [ ] Master artefact register created with all metadata
- [ ] Ownership assigned to all artefacts
- [ ] Artefacts organized in appropriate locations
- [ ] Permissions configured correctly
- [ ] Distribution matrix created mapping artefacts to audiences
- [ ] Hub page created for easy navigation
- [ ] Communications sent to all stakeholder groups
- [ ] Feedback collected and incorporated
- [ ] Maintenance process established
- [ ] Register accessible and kept current

## Related Tickets
All VIBE tickets potentially create artefacts, particularly:
- VIBE-95/96: Risks and mitigations register
- VIBE-97/98: Mitigation plans and policies
- VIBE-99: KPI04 evidence pack
- VIBE-100: Governance materials
- VIBE-187/188/189: Educational materials
