# VIBE-189: Educational Materials - Efficiency - Technical Plan

## Executive Summary

Create comprehensive educational documentation explaining efficiency metrics for AI coding tools within the VIBE pilot programme. This is a documentation-only task requiring research, content development, and stakeholder engagement to produce a 3000-5000 word markdown document covering four core efficiency metrics with practical application guidance.

## Technical Approach

### Document-Driven Development

This ticket follows a documentation-centric approach with no code changes required:

1. **Research Phase**: Gather quantitative data and qualitative insights
2. **Content Development**: Write clear, accessible explanations of technical concepts
3. **Stakeholder Review**: Validate accuracy and usefulness with pilot participants
4. **Publication**: Commit to repository and distribute to stakeholders

### Documentation Architecture

```
docs/
└── educational-materials/
    └── efficiency-metrics.md     # Main deliverable (3000-5000 words)
```

**File Location Rationale**:
- Placed in `docs/educational-materials/` for discoverability
- Markdown format for version control and easy updates
- Co-located with other VIBE pilot documentation

## Core Metrics Framework

### Metric Design Principles

Each of the four efficiency metrics follows a consistent structure:

1. **Definition**: Precise technical explanation with formula
2. **Calculation Method**: Step-by-step data collection and computation
3. **VIBE Pilot Application**: How it maps to HMCTS context
4. **Interpretation Guidelines**: What values mean in practice
5. **Limitations**: What the metric doesn't capture
6. **Examples**: Concrete scenarios with calculations

### Metric 1: Tokens per Story Point

**Formula**: `Total Tokens Consumed ÷ Story Points Completed`

**Data Sources**:
- Token usage: Claude API logs (input + output tokens)
- Story points: JIRA ticket fields

**Technical Implementation Notes**:
- Extract token counts from Claude conversation logs
- Map conversations to JIRA tickets via commit messages or PR links
- Aggregate tokens per ticket, sum story points
- Calculate ratio over sprint or time period

**Expected Ranges** (to be validated with pilot data):
- Simple CRUD stories (3-5 SP): 15,000-25,000 tokens/SP
- Medium complexity (8-13 SP): 8,000-15,000 tokens/SP
- Complex features (13-21 SP): 5,000-10,000 tokens/SP

**Interpretation Framework**:
- **Decreasing over time**: Developer learning effective prompting
- **Increasing over time**: Growing complexity OR inefficient usage
- **High variance**: Inconsistent ticket estimation OR varied AI reliance
- **Very low (<3K/SP)**: Possible under-utilization of AI assistance

### Metric 2: Lines of Code per Token

**Formula**: `Lines of Code Changed ÷ Total Tokens Consumed`

**Data Sources**:
- LOC: Git statistics (`git diff --stat`, GitHub API)
- Tokens: Claude API logs

**Technical Implementation Notes**:
- Count additions + modifications (not deletions alone)
- Extract from git commit or PR statistics
- Map to same time period as token usage
- Handle language differences (TypeScript vs SCSS vs JSON)

**Expected Ranges** (TypeScript/JavaScript):
- Code generation: 15-30 LOC per 1000 tokens
- Refactoring: 5-15 LOC per 1000 tokens
- Documentation: 20-40 LOC per 1000 tokens
- Bug fixes: 3-10 LOC per 1000 tokens

**Interpretation Framework**:
- **High LOC/token**: Efficient generation OR boilerplate code
- **Low LOC/token**: Complex logic OR significant conversation
- **Balance with quality**: High output shouldn't mean low quality
- **Context matters**: Refactoring naturally has lower ratios

### Metric 3: Lines of Code per PR Count

**Formula**: `Total LOC Changed ÷ Number of Pull Requests`

**Data Sources**:
- LOC: Git statistics per PR
- PR count: GitHub API or repository analytics

**Technical Implementation Notes**:
- Use PR statistics from GitHub (additions + deletions)
- Calculate average over time period
- Segment by developer, feature type, or team
- Compare AI-assisted vs non-AI-assisted PRs if possible

**Expected Ranges** (HMCTS context):
- Small focused PRs: 50-200 LOC
- Optimal review size: 200-400 LOC
- Large feature PRs: 400-800 LOC
- Very large PRs: >800 LOC (may indicate problems)

**Interpretation Framework**:
- **Sweet spot (200-400 LOC)**: Reviewable, cohesive changes
- **Too small (<100 LOC)**: May indicate fragmentation
- **Too large (>800 LOC)**: Review bottleneck risk
- **AI impact**: Should enable appropriately-sized PRs, not inflate them

### Metric 4: Tokens per Time to Pass PR

**Formula**: `Total Tokens Used ÷ Time from PR Creation to Merge (hours)`

**Data Sources**:
- Tokens: Claude API logs for PR development period
- Time: GitHub PR timestamps (created_at, merged_at)

**Technical Implementation Notes**:
- Track tokens used during PR development window
- Calculate time from PR creation to final approval/merge
- Handle multi-iteration PRs (sum all token usage)
- Exclude review wait time (focus on active development)

**Expected Ranges**:
- Fast PRs (<4 hours): 1,000-3,000 tokens/hour
- Standard PRs (4-24 hours): 500-1,500 tokens/hour
- Complex PRs (>24 hours): 200-800 tokens/hour

**Interpretation Framework**:
- **Lower tokens/time**: Efficient path to shippable code
- **Higher tokens/time**: Multiple iterations OR reviewer feedback cycles
- **Fast approval**: Higher quality initial code from AI assistance
- **Sustained high rate**: Possible indication of rushed work

## Data Collection Strategy

### Technical Infrastructure Requirements

**Existing Systems**:
- Claude API access with conversation logging
- GitHub API access for repository statistics
- JIRA API access for story point data
- Version control system (Git) with full history

**Data Pipeline**:
```
Claude API Logs → Token extraction → Ticket mapping
GitHub API → PR statistics → LOC calculation
JIRA API → Story points → Ticket complexity
```

**Privacy and Anonymization**:
- Aggregate metrics at team level, not individual
- Remove sensitive code content from logs
- Anonymize developer names in shared reports
- Secure storage of raw data with access controls

### Collection Frequency

**Recommended Cadence**:
- **Token logs**: Continuous collection, analyzed weekly
- **Git statistics**: Extracted per PR, summarized weekly
- **Story points**: Captured at sprint end
- **Dashboard updates**: Weekly for trending, monthly for reporting

### Baseline Establishment

**Pre-Pilot Baseline** (if available):
- Historical story points per sprint
- Average PR cycle times
- Code quality metrics

**Pilot Start Baseline**:
- Week 1-2 metrics establish "learning curve" baseline
- Used for comparison with weeks 3-6 and beyond

## Success Criteria Definition

### Minimum Viable Success (Pilot Worth Continuing)

**Quantitative Thresholds**:
1. **Productivity**: 15-20% increase in story points delivered per sprint (maintaining quality)
2. **Speed**: 20-30% reduction in time from PR creation to merge
3. **Efficiency**: Stable or decreasing tokens/story point after learning period (weeks 3-6)
4. **Code Quality**: No degradation in post-merge defects or technical debt

**Qualitative Indicators**:
- Developer satisfaction scores ≥4/5
- Developers actively choose to use AI tool
- No significant increase in review rework

### Strong Success (Exceptional Value)

**Quantitative Indicators**:
1. **Productivity**: 40-50% increase in story points delivered
2. **Speed**: 40-50% reduction in PR cycle time
3. **Quality**: Improved code quality metrics (lower defect rate)
4. **Efficiency**: 30-40% reduction in tokens/story point by month 3

**Qualitative Indicators**:
- Developers report significant confidence boost
- New team members onboard faster
- Stakeholders notice velocity improvements

### Warning Signs (Problems Requiring Action)

**Quantitative Red Flags**:
1. **Increasing tokens/story point** beyond week 4 (inefficient usage)
2. **Decreasing LOC/token** without explanation (over-reliance on conversation)
3. **PR sizes growing** without quality improvement (rushed code)
4. **Slower PR cycle times** (AI adding overhead, not reducing it)

**Qualitative Red Flags**:
- Developer frustration with tool
- Increased review comments about code quality
- Team members avoiding AI tool usage
- Higher post-merge defect rates

### Time-Based Expectations

**Week 1-2 (Learning Curve)**:
- Metrics expected to be **below baseline**
- Token usage may be **higher** (exploration)
- PR cycle times may be **longer** (unfamiliarity)
- **Normal**: Inefficiency while learning effective prompts

**Week 3-6 (Efficiency Gains Emerging)**:
- Metrics should **match or exceed baseline**
- Token usage should **stabilize**
- PR cycle times should **decrease**
- Story points delivered should **increase**

**Week 7+ (Sustained Improvement)**:
- Metrics should show **consistent gains**
- Token efficiency should **continue improving**
- Developer confidence should be **high**
- Benefits should be **self-evident**

## Practical Application Guidance

### Dashboard Design Recommendations

**Key Metrics Display** (Weekly Dashboard):
```
┌─────────────────────────────────────────────┐
│ VIBE Pilot Efficiency Dashboard             │
├─────────────────────────────────────────────┤
│ Tokens/Story Point:    12.5K  ↓ 15%        │
│ LOC/Token:             22.3   ↑ 8%         │
│ LOC/PR:                325     → Stable     │
│ Tokens/Time to Pass:   850/hr ↓ 22%        │
├─────────────────────────────────────────────┤
│ Story Points Delivered: 42     ↑ 28%        │
│ PR Cycle Time:         18hrs  ↓ 35%        │
│ Code Quality Score:    4.2/5  → Stable     │
└─────────────────────────────────────────────┘
```

**Trend Charts** (Weekly Over Time):
- Line charts showing 8-week rolling trends
- Comparison to baseline periods
- Annotations for significant events (training, tool updates)

**Segmentation Views**:
- By ticket type (feature, bug, refactor)
- By complexity (story point buckets)
- By developer (private, respectful)

### Analysis Approach

**Focus on Trends Over Absolutes**:
- Week-over-week % change more important than raw values
- Look for sustained direction, not single-week spikes
- Compare similar ticket types across time

**Outlier Investigation Protocol**:
1. Identify metrics >2 standard deviations from mean
2. Review ticket/PR details for context
3. Interview developer if pattern unclear
4. Document findings (learning opportunity)

**Respectful Comparison Practices**:
- Never publicly rank developers by metrics
- Use anonymous examples in discussions
- Focus on learning from high performers
- Provide 1-1 feedback, not public criticism

### Decision-Making Framework

**When Metrics Suggest Process Changes**:
- Multiple developers show same inefficiency pattern
- Trend is sustained over 3+ weeks
- Root cause analysis identifies process issue
- Change proposal has team buy-in

**When Metrics Suggest Training Needs**:
- Individual developer metrics diverge from team
- Specific metric (e.g., tokens/SP) consistently high
- Developer expresses interest in improvement
- Targeted training available

**When Metrics Indicate Pilot Success/Failure**:
- **Success**: All minimum thresholds met by week 6, trends positive
- **Strong Success**: Multiple strong indicators by week 8
- **Failure**: No improvement by week 8, or quality degradation
- **Mixed**: Some metrics positive, some negative (requires deeper analysis)

### Anti-Gaming Measures

**Potential Gaming Behaviors**:
- Artificially splitting PRs to lower LOC/PR
- Under-using AI to lower tokens/SP
- Rushing reviews to lower time-to-pass
- Inflating story points to improve ratios

**Preventative Measures**:
1. **Multiple metrics**: No single metric determines success
2. **Quality gates**: Code quality metrics must remain stable
3. **Qualitative checks**: Developer satisfaction surveys
4. **Transparency**: Explain metric limitations upfront
5. **Team focus**: Aggregate team metrics, not individual rankings

### Continuous Improvement Cycle

**Monthly Review Process**:
1. Review dashboard trends with team
2. Identify areas of improvement and concern
3. Gather developer feedback on tool usage
4. Share learnings and best practices
5. Update prompts, workflows, or training

**Quarterly Assessment**:
1. Compare to pilot objectives
2. Analyze cost-benefit (token costs vs productivity gains)
3. Stakeholder report with recommendations
4. Decide: continue, expand, adjust, or discontinue

## Limitations and Complementary Evaluation

### What Metrics Don't Measure

**Code Quality and Correctness**:
- LOC says nothing about elegance or maintainability
- Fast PR approval doesn't guarantee bug-free code
- High token usage might produce excellent, well-tested code

**Developer Learning and Growth**:
- Metrics don't capture improved architecture skills
- Learning to prompt effectively is valuable but not measured
- Knowledge transfer and team collaboration invisible

**Innovation and Problem-Solving**:
- Creative solutions may take more tokens/time initially
- Exploration and experimentation penalized by efficiency metrics
- Long-term technical debt reduction not captured

**Team Dynamics**:
- Collaboration quality not reflected
- Knowledge sharing not measured
- Morale and job satisfaction separate

### Risks of Over-Reliance on Metrics

**Gaming Behaviors**:
- Developers optimize for metrics, not outcomes
- Focus on quantity over quality
- Risk-averse behavior to maintain scores

**Missing Qualitative Factors**:
- Metrics show "what" but not "why"
- Context and nuance lost in numbers
- Edge cases and exceptions ignored

**Demotivating Developers**:
- Feeling watched or judged
- Anxiety about metrics performance
- Loss of autonomy and creativity

### Complementary Evaluation Methods

**Code Reviews and Quality Assessments**:
- Technical debt tracking
- Architecture review sessions
- Post-merge defect rates
- Code complexity metrics

**Developer Surveys and Feedback**:
- Weekly quick pulse surveys
- Monthly detailed feedback sessions
- Anonymous suggestion channels
- Retrospective discussions

**Stakeholder Interviews**:
- Product manager perspective on velocity
- Tech leads on code quality and maintainability
- Delivery managers on predictability
- End users on feature quality

**Production Metrics**:
- Incident rates and severity
- Performance and reliability
- User satisfaction scores
- Feature adoption rates

## Content Development Plan

### Section-by-Section Development

**1. Introduction (Target: 300-400 words)**
- Hook: Why efficiency matters for AI coding tools
- Context: VIBE pilot objectives overview
- Scope: Four core metrics covered
- Audience: Technical and non-technical readers
- Structure: Document roadmap

**2. Core Metrics (Target: 2000-2500 words)**
- Subsection per metric (500-600 words each)
- Consistent structure: Definition → Calculation → Application → Interpretation → Limitations
- Visual aids: Tables showing example calculations
- Real examples: Anonymized VIBE pilot scenarios

**3. VIBE Pilot Mapping (Target: 400-500 words)**
- Pilot objectives recap
- Data collection infrastructure
- Privacy and security approach
- Baseline establishment strategy
- Success indicator alignment

**4. Success Criteria (Target: 500-600 words)**
- Minimum viable success thresholds
- Strong success indicators
- Warning signs and red flags
- Time-based expectations framework
- Qualitative vs quantitative balance

**5. Practical Usage (Target: 400-500 words)**
- Dashboard design recommendations
- Analysis approach guidelines
- Decision-making framework
- Anti-gaming measures
- Continuous improvement cycle

**6. Limitations (Target: 300-400 words)**
- What metrics miss
- Over-reliance risks
- Complementary methods
- Balanced evaluation approach

**7. References (Target: 100-200 words)**
- Research citations
- HMCTS standards links
- Tool documentation
- Pilot charter reference

### Writing Style Guidelines

**Tone**:
- Professional but approachable
- Evidence-based, not promotional
- Balanced (strengths and limitations)
- Respectful of developer concerns

**Technical Level**:
- Explain jargon on first use
- Provide examples for complex concepts
- Assume intelligent non-technical readers
- Offer technical details in footnotes/callouts

**Structure**:
- Clear heading hierarchy (H1 → H2 → H3)
- Short paragraphs (3-5 sentences)
- Bullet points for lists
- Tables for comparisons

**Visual Aids**:
- Example calculation tables
- Dashboard mockups (ASCII or embedded images)
- Metric relationship diagrams
- Timeline charts for expectations

## Stakeholder Engagement Plan

### Pre-Writing Consultation

**VIBE Pilot Participants** (2-3 developers):
- How do they currently think about efficiency?
- What metrics would be useful to them?
- Concerns about being measured?
- Suggestions for dashboard design?

**Technical Leadership** (1-2 leads):
- What decisions will these metrics inform?
- What evidence do stakeholders need?
- Risk tolerance for pilot failure?
- Success criteria priorities?

**Product Management** (1 PM):
- How does efficiency map to business value?
- What velocity improvements matter?
- Trade-offs between speed and quality?

**Finance/Procurement** (if available):
- Token costs and budget constraints
- ROI calculation requirements
- Cost-benefit analysis expectations

### Review Cycle

**Draft 1 - Internal Technical Review**:
- Verify metric definitions are accurate
- Check calculation methods are correct
- Validate technical terminology
- Ensure examples are realistic

**Draft 2 - Clarity Review**:
- Non-technical reader test
- Simplify jargon and complex explanations
- Add more examples where needed
- Improve structure and flow

**Draft 3 - Stakeholder Review**:
- Share with VIBE pilot team
- Gather feedback on usefulness
- Identify missing perspectives
- Validate success criteria resonate

**Final - Approval and Publication**:
- Address all feedback
- Final proofread
- Commit to repository
- Announce to stakeholders

## Risk Mitigation

### Potential Risks and Mitigation Strategies

**Risk 1: Insufficient Data Available**
- **Mitigation**: Document expected data sources clearly; provide fallback metrics
- **Contingency**: Use smaller sample size with caveats; extend data collection period

**Risk 2: Metrics Misinterpreted**
- **Mitigation**: Clear interpretation guidelines; examples of correct and incorrect conclusions
- **Contingency**: Provide training session; offer consultation for analysis

**Risk 3: Developer Resistance to Measurement**
- **Mitigation**: Emphasize team-level metrics; explain anti-gaming measures; involve developers in design
- **Contingency**: Make metrics optional initially; focus on self-improvement not comparison

**Risk 4: Over-Simplification of Complex Reality**
- **Mitigation**: Strong limitations section; complementary methods documented
- **Contingency**: Regular reminder that metrics are guides, not absolutes

**Risk 5: Document Becomes Obsolete**
- **Mitigation**: Include maintenance plan; versioning; review triggers
- **Contingency**: Quarterly review scheduled; owner assigned

## Success Measures for This Documentation

### Immediate Success Indicators

- Technical leadership can explain all four metrics accurately
- Pilot participants know what data to collect
- Dashboard can be designed from document specifications
- Stakeholders understand what success looks like

### Medium-Term Success Indicators (3-6 months)

- Document referenced in weekly pilot reviews
- Metrics actually collected and analyzed
- Decisions informed by documented criteria
- No major misunderstandings about metrics

### Long-Term Success Indicators (6-12 months)

- Other government departments use as template
- Pilot evaluation report cites this document
- Metrics framework adopted for other tools
- Document updated based on learnings

## Timeline and Milestones

### Phase 1: Research and Preparation (3 days)
- Day 1: Review pilot objectives, existing data sources
- Day 2: Interview stakeholders (developers, leads, PM)
- Day 3: Research industry benchmarks, compile references

### Phase 2: Content Development (5 days)
- Day 4: Write introduction and metric definitions (2.1, 2.2)
- Day 5: Complete metric definitions (2.3, 2.4) and VIBE mapping
- Day 6: Write success criteria and practical usage sections
- Day 7: Write limitations, references, create visual aids
- Day 8: Polish, proofread, format

### Phase 3: Review and Refinement (3 days)
- Day 9: Internal technical review, incorporate feedback
- Day 10: Clarity review with non-technical reader, revise
- Day 11: Stakeholder review cycle

### Phase 4: Finalization (1 day)
- Day 12: Address final feedback, final proofread, publish

**Total Timeline: 12 working days (2.5 weeks)**

### Critical Path Dependencies

- **Must Have**: Access to Claude API logs for token examples
- **Must Have**: Sample JIRA story point data
- **Must Have**: Example git statistics from recent PRs
- **Should Have**: Interview time with 2-3 VIBE participants
- **Nice to Have**: Historical baseline data for comparison

## Resource Requirements

### Human Resources

- **Technical Writer/Documentation Lead**: 12 days (primary author)
- **VIBE Pilot Participants**: 2-3 hours total (interviews, review)
- **Technical Leadership**: 2 hours total (consultation, review)
- **Product Manager**: 1 hour (consultation)
- **Reviewer (Non-Technical)**: 1 hour (clarity review)

### Technical Resources

- Access to Claude API logs (anonymized extracts)
- GitHub API access for PR statistics
- JIRA access for story point data
- Confluence/SharePoint for publication

### Reference Materials

- VIBE pilot charter and objectives
- HMCTS service standards documentation
- Claude Code usage guidelines
- Research on AI coding efficiency (if available)

## Definition of Done

- [ ] Document created at `docs/educational-materials/efficiency-metrics.md`
- [ ] All four core metrics thoroughly documented (2.1-2.4)
- [ ] VIBE pilot mapping section complete
- [ ] Success criteria clearly defined with quantitative thresholds
- [ ] Practical usage guidance with dashboard recommendations
- [ ] Limitations and complementary methods documented
- [ ] References section complete with working links
- [ ] Word count: 3000-5000 words
- [ ] Visual aids included (tables, examples, diagrams)
- [ ] Technical accuracy validated by reviewer
- [ ] Clarity validated by non-technical reader
- [ ] Stakeholder feedback incorporated
- [ ] Final proofread complete
- [ ] Markdown formatting renders correctly
- [ ] Committed to repository and merged
- [ ] Stakeholders notified of availability
- [ ] JIRA ticket updated with summary

## Maintenance Plan

### Review Triggers

- Quarterly scheduled review
- Pilot scope changes
- New metrics identified
- Significant learnings from pilot data
- Stakeholder feedback indicating issues

### Update Process

1. Create branch from main
2. Make updates with clear commit messages
3. Submit PR with change summary
4. Request review from pilot lead
5. Merge and notify stakeholders

### Ownership

- **Primary Owner**: VIBE Pilot Technical Lead
- **Backup Owner**: Documentation Team Lead
- **Review Cycle**: Quarterly or as needed

## Related Documentation

- VIBE-187: Educational Materials - Satisfaction & Trust
- VIBE-188: Educational Materials - Quality
- VIBE-99: KPI04 Evidential Pack
- VIBE Pilot Charter
- HMCTS AI Coding Standards

## Appendix: Example Metric Calculations

### Example 1: Tokens per Story Point Calculation

**Scenario**: Sprint 3 of VIBE pilot

**Data**:
- Ticket VIBE-123 (8 story points): 45,000 tokens
- Ticket VIBE-124 (5 story points): 28,000 tokens
- Ticket VIBE-125 (13 story points): 62,000 tokens

**Calculation**:
```
Total tokens: 45,000 + 28,000 + 62,000 = 135,000
Total story points: 8 + 5 + 13 = 26
Tokens per story point: 135,000 ÷ 26 = 5,192 tokens/SP
```

**Interpretation**: This is within the expected efficient range (5K-10K for complex tickets), suggesting appropriate AI usage.

### Example 2: LOC per Token Calculation

**Scenario**: Feature implementation PR

**Data**:
- PR #456: +342 LOC, -28 LOC (net +314 LOC)
- Token usage during development: 18,500 tokens

**Calculation**:
```
LOC per 1000 tokens: (314 ÷ 18,500) × 1000 = 16.97 LOC/1000 tokens
```

**Interpretation**: Reasonable for feature development with both new code and refactoring. Within expected range (15-30).

### Example 3: Dashboard Interpretation

**Week 6 Dashboard**:
```
Metric                 | Current | Baseline | Change | Status
-----------------------|---------|----------|--------|--------
Tokens/Story Point     | 6,200   | 9,800    | -37%   | ✓ Good
LOC/Token (per 1000)   | 23.4    | 19.1     | +23%   | ✓ Good
LOC/PR                 | 385     | 420      | -8%    | ✓ Good
Tokens/Time to Pass    | 720/hr  | 1,150/hr | -37%   | ✓ Good
Story Points/Sprint    | 38      | 28       | +36%   | ✓ Good
PR Cycle Time          | 14 hrs  | 22 hrs   | -36%   | ✓ Good
```

**Interpretation**: Strong success indicators across all metrics. Token efficiency improving, code output increasing, PR cycle faster, productivity up. Pilot demonstrating clear value.
