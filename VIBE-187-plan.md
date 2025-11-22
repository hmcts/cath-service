# VIBE-187: Educational Materials - satisfaction & trust - Implementation Plan

## Summary
Create comprehensive educational materials explaining satisfaction and trust metrics for the VIBE pilot, including metric definitions, implementation approach, interpretation guidance, and success criteria accessible to both technical and non-technical audiences.

## Key Implementation Points

### Phase 1: Research and Content Planning (2 days)
1. **Review metric frameworks** (0.5 days):
   - Research industry standards for satisfaction/trust metrics
   - Review academic literature on developer experience
   - Examine existing HMCTS measurement approaches
   - Identify best practices

2. **Gather pilot details** (0.5 days):
   - Document exact survey questions being used
   - Understand data collection tools and methods
   - Get baseline data if available
   - Identify targets or benchmarks

3. **Create content outline** (0.5 days):
   - Structure document sections
   - Identify examples and case studies needed
   - Plan visual aids
   - Assign content priorities

4. **Stakeholder consultation** (0.5 days):
   - Interview developers about satisfaction factors
   - Talk to business stakeholders about their perspective
   - Understand what explanations are most needed
   - Get input on "what good looks like"

### Phase 2: Content Development (5 days)

**Introduction Section** (0.5 days):
- Why satisfaction and trust metrics matter
- Overview of the four metrics
- How they relate to project success
- Reading guide

**Metric 1: Number of Comments per PR** (1 day):
- Definition: What we count as a "comment"
- Collection method: GitHub/Azure DevOps API
- Interpretation: What different ranges indicate
  - 0-2 comments: Potential rubber-stamping
  - 3-10 comments: Healthy engagement
  - 11-15 comments: High engagement or complexity
  - 16+ comments: Possible quality issues or confusion
- Factors that influence: PR size, team norms, developer experience
- Good looks like: 3-10 range, constructive feedback, decreasing over time
- Examples: Sample PRs with different comment patterns
- Caveats: Adjust for team culture, not a quality proxy alone

**Metric 2: Quantitative Survey Results** (1 day):
- Survey design principles
- Key questions being asked:
  - Overall satisfaction (1-10)
  - Trust in AI-generated code quality (1-10)
  - Comfort using AI tools (1-10)
  - Likelihood to recommend (1-10)
  - Specific aspects (productivity, learning, enjoyment)
- Interpretation guidance:
  - Score ranges and meanings
  - Trend analysis
  - Variance/consistency
  - Comparison to benchmarks
- Good looks like: >7/10 average, low variance, improving trend
- Survey cadence: Monthly pulse, quarterly comprehensive
- Response rate expectations and importance

**Metric 3: Developer Experience** (1 day):
- Qualitative vs. quantitative aspects
- Assessment methods:
  - Open-ended survey questions
  - One-on-one interviews
  - Focus groups
  - Observational studies
  - Support ticket analysis
- Key themes to explore:
  - Ease of setup and integration
  - Learning curve
  - Workflow impact
  - Tool reliability
  - Support and documentation quality
  - Career development implications
- Analysis approach: Thematic coding, sentiment analysis
- Good looks like: Overwhelmingly positive sentiment, voluntary adoption, advocacy
- Red flags: Workarounds, abandonment, frustration themes

**Metric 4: Business Team Experience** (1 day):
- Business stakeholder perspective
- Assessment methods:
  - Stakeholder interviews
  - Delivery metrics review
  - Quality perception surveys
  - Collaboration feedback
- Key questions:
  - Are features delivered faster?
  - Is quality maintained or improved?
  - Is the team easier to work with?
  - Do you trust the team's deliverables?
  - Would you advocate for AI adoption?
- Good looks like: Perceived velocity increase, maintained quality confidence, positive partnership
- Balancing business and developer metrics

**VIBE Pilot Implementation** (0.5 days):
- Specific tools used in pilot
- Data collection schedule
- Survey instruments (with examples)
- Baseline measurements
- Targets for success
- How data will be reported

**Interpreting Results** (0.5 days):
- How to read metric dashboards
- Understanding trends and patterns
- Balancing multiple metrics
- When to investigate further
- Action recommendations based on results

**Case Studies and Examples** (0.5 days):
- Scenario 1: High satisfaction but low comments (what it might mean)
- Scenario 2: Improving developer experience but business concerns (how to address)
- Scenario 3: High variance in survey results (what to investigate)
- Scenario 4: All metrics positive (celebrate and sustain)

**FAQ Section** (0.25 days):
Common questions like:
- Why are we measuring these specific metrics?
- How were targets determined?
- What if results are mixed?
- How often will we report?
- What happens if metrics are poor?

**Resources and References** (0.25 days):
- Academic papers on developer productivity
- Industry reports on AI coding tools
- Internal HMCTS standards
- Related VIBE documents

### Phase 3: Visual Design (2 days)
1. **Create diagrams** (1 day):
   - Metric relationship diagram
   - Data flow: collection to reporting
   - Interpretation decision tree
   - "Good/Concerning/Poor" indicator scales

2. **Design infographics** (0.5 days):
   - One-page summary of each metric
   - Quick reference card
   - Metric dashboard mockup

3. **Add examples** (0.5 days):
   - Sample survey forms
   - Example PR comment threads (anonymized)
   - Mock trend charts
   - Score interpretation guides

### Phase 4: Review and Refinement (2 days)
1. **Internal review** (1 day):
   - Project team review for accuracy
   - Technical review for correct terminology
   - Developer review for clarity and usefulness
   - Incorporate feedback

2. **Stakeholder review** (1 day):
   - Share with sample developers
   - Get business stakeholder input
   - AI Steering Group review
   - Address comments and suggestions

### Phase 5: Finalization and Publication (1 day)
1. **Final polish** (0.5 days):
   - Proofread and edit
   - Check all links and references
   - Ensure consistent formatting
   - Add table of contents and index

2. **Publish and distribute** (0.5 days):
   - Upload to SharePoint/Confluence
   - Add to artefacts register (VIBE-106)
   - Announce to stakeholders
   - Include in VIBE-107 communications
   - Share with TAB community

## Technical Decisions

**Audience**: Write for mixed technical/non-technical audience; explain technical concepts but don't oversimplify.

**Length**: Aim for 15-20 pages; comprehensive but digestible.

**Format**: Use clear headings, bullet points, visual breaks; avoid dense paragraphs.

**Examples**: Use realistic but anonymized examples; avoid anything confidential.

## Example "What Good Looks Like" Summary

| Metric | Target | Red Flag |
|--------|--------|----------|
| **Comments/PR** | 3-10, constructive | <2 (superficial review) or >15 (quality issues) |
| **Satisfaction Survey** | >7/10 average | <5/10 or declining trend |
| **Developer Experience** | Positive sentiment, voluntary use | Workarounds, abandonment, complaints |
| **Business Experience** | Faster delivery perception, quality confidence | Concerns about quality or velocity |

## Resource Requirements
- Content writer/researcher: 8 days
- Designer for visuals: 2 days
- Subject matter experts: 2 days for interviews/review
- Stakeholders: 2 hours for review

## Dependencies
- VIBE-99: KPI04 evidence pack for context
- Pilot implementation details (survey questions, tools)
- Early results (if available) for realistic examples
- Access to stakeholders for interviews

## Definition of Done
- [ ] Comprehensive document explaining all four satisfaction & trust metrics
- [ ] Each metric includes definition, rationale, collection method, and interpretation
- [ ] VIBE pilot implementation approach documented
- [ ] "What good looks like" clearly defined for each metric
- [ ] Visual aids created (diagrams, infographics, examples)
- [ ] Case studies and examples included
- [ ] FAQ section complete
- [ ] Internal and stakeholder review completed
- [ ] Document published to appropriate location
- [ ] Added to artefacts register and communicated to stakeholders

## Related Tickets
- VIBE-188: Educational Materials - Quality (similar format)
- VIBE-189: Educational Materials - Efficiency (similar format)
- VIBE-99: KPI04 Evidential Pack (uses these metrics)
- VIBE-106: Artefacts register (where this will be listed)
- VIBE-107: TAB/AI governance visibility (audience for these materials)
