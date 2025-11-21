# VIBE-187: Educational Materials - Satisfaction & Trust

## Purpose

This document provides educational materials to help HMCTS teams understand, measure, and improve satisfaction and trust metrics in the VIBE pilot program. It serves as a practical guide for developers, product owners, and business stakeholders to interpret metrics and take action based on the data.

## Audience

**Primary Audience:**
- Development teams participating in the VIBE pilot
- Product owners and delivery managers
- Technical leads and architects

**Secondary Audience:**
- Business stakeholders evaluating the pilot
- Leadership teams reviewing program effectiveness
- Future teams considering adoption

## Document Structure

The educational materials will be organized into the following sections:

### 1. Executive Summary
- Brief overview of satisfaction and trust metrics
- Why these metrics matter for the VIBE pilot
- Quick reference for interpreting results

### 2. Understanding Satisfaction & Trust Metrics

#### 2.1 Metric Definitions
- **Developer Satisfaction**: How satisfied developers are with the AI-assisted development experience
- **Developer Trust**: How much developers trust the AI-generated code and suggestions
- **Business Trust**: How much business stakeholders trust the AI development process and outcomes
- **Code Quality Satisfaction**: Satisfaction with the quality of code produced

#### 2.2 Why These Metrics Matter
- Direct impact on developer productivity
- Influence on adoption rates and team morale
- Correlation with code quality and maintainability
- Business confidence in AI-assisted development

### 3. Metrics Collection Framework

#### 3.1 Number of Comments per Pull Request
**What it measures:** Code review engagement and discussion volume

**Collection method:**
- Automated tracking via GitHub API
- Weekly aggregation and trend analysis
- Comparison against baseline (pre-AI) metrics

**Interpretation guidelines:**
- Baseline range: Expected comment volume for manual development
- Increased comments may indicate:
  - Code clarity issues requiring discussion
  - Learning curve for AI-generated patterns
  - Enhanced scrutiny of AI-generated code
- Decreased comments may indicate:
  - Higher initial code quality
  - Clearer implementation patterns
  - Reduced need for clarification

**What good looks like:**
- Similar or lower comment volume compared to baseline (AI code is clear)
- Comments focused on business logic rather than code quality
- Trend showing decreasing comments over time (learning curve)

#### 3.2 Quantitative Survey Results

**What it measures:** Direct feedback from developers and stakeholders

**Survey structure:**
- Frequency: Bi-weekly or end-of-sprint
- Format: 5-point Likert scale + open-ended questions
- Distribution: All team members involved in VIBE pilot

**Key questions:**

*Developer Satisfaction:*
- How satisfied are you with AI assistance in your daily development? (1-5)
- How much time do you estimate AI saved this week? (hours)
- What aspects of AI assistance were most valuable?
- What aspects need improvement?

*Developer Trust:*
- How confident are you in reviewing AI-generated code? (1-5)
- How often do you verify AI suggestions before accepting? (Always/Often/Sometimes/Rarely/Never)
- Have you found any significant issues with AI-generated code? (Yes/No + details)

*Business Stakeholder Trust:*
- How confident are you in the quality of deliverables? (1-5)
- Do you believe AI is improving time-to-market? (1-5)
- What concerns do you have about AI-assisted development?

**Interpretation guidelines:**
- Satisfaction scores: 4+ is good, 3.5-3.9 is acceptable, <3.5 needs attention
- Trust scores: Should trend upward over time as familiarity increases
- Time savings: Track actual vs. perceived to validate efficiency gains

**What good looks like:**
- Average satisfaction score of 4.0+ across the team
- Trust scores at 3.5+ and increasing
- Consistent time savings reported (20-30% on average)
- Decreasing concerns about AI code quality over time

#### 3.3 Developer Experience Metrics

**What it measures:** Day-to-day development workflow impact

**Key indicators:**

*Productivity metrics:*
- Lines of code written per day (with AI assistance)
- Time from ticket assignment to PR submission
- Number of iterations required before PR approval
- Time spent on code review vs. feature development

*Quality metrics:*
- Bug rate in AI-assisted features vs. baseline
- Test coverage percentage
- Time to fix bugs in AI-generated code
- Accessibility compliance issues

*Workflow metrics:*
- Time spent interacting with AI tools
- Frequency of AI suggestion acceptance
- Manual code modification rate on AI suggestions
- Context switching frequency

**Collection method:**
- GitHub metrics API for code and PR data
- Developer time logs (manual or automated)
- Quality metrics from CI/CD pipeline
- Bug tracking system integration

**Interpretation guidelines:**
- Compare all metrics against baseline (pre-AI) data
- Account for learning curve in first 2-4 weeks
- Look for trends rather than absolute values
- Consider team feedback alongside quantitative data

**What good looks like:**
- 20-30% reduction in time from ticket to PR submission
- Similar or improved bug rates compared to baseline
- Test coverage maintained or improved (>80% target)
- Decreasing manual modification rate (AI learns patterns)
- Developer feedback indicates workflow improvements

#### 3.4 Business Team Experience Metrics

**What it measures:** Stakeholder confidence and business outcomes

**Key indicators:**

*Delivery metrics:*
- Time from backlog to production
- Feature completion velocity
- Release cadence and predictability
- Rework required after business review

*Quality perception:*
- User acceptance testing pass rate
- Production incidents in AI-assisted features
- Accessibility and compliance adherence
- Documentation quality and completeness

*Confidence indicators:*
- Stakeholder satisfaction scores (surveys)
- Willingness to expand AI usage to more features
- Concerns raised in retrospectives
- Resource allocation decisions (expanding/reducing pilot)

**Collection method:**
- JIRA/project management tool metrics
- Production monitoring and incident reports
- Regular stakeholder surveys (bi-weekly)
- Retrospective feedback analysis

**Interpretation guidelines:**
- Business trust lags developer trust (expected)
- Focus on outcome metrics (delivery, quality) not just sentiment
- Compare pilot features against non-pilot features
- Track confidence trajectory over time

**What good looks like:**
- Delivery time reduced by 15-25% for pilot features
- Production incident rate similar to or lower than baseline
- Stakeholder satisfaction score of 3.5+ (and increasing)
- Active support for expanding pilot scope
- Positive feedback in retrospectives about pace and quality

### 4. Success Criteria ("What Does Good Look Like")

#### 4.1 Short-term Success (First 4-8 weeks)
- Developer satisfaction: 3.5+ average, trending upward
- Developer trust: 3.0+ average, with clear upward trend
- PR comments: No significant increase vs. baseline
- No critical production incidents attributed to AI code
- Team actively using AI for 50%+ of development tasks

#### 4.2 Medium-term Success (2-3 months)
- Developer satisfaction: 4.0+ average, stable
- Developer trust: 3.5+ average, stable or increasing
- Business trust: 3.5+ average, trending upward
- Delivery velocity: 20%+ improvement vs. baseline
- Bug rate: Equal to or better than baseline
- Test coverage: Maintained above 80%
- Positive trend in all survey metrics

#### 4.3 Long-term Success (End of pilot)
- Developer satisfaction: 4.0+ average consistently
- Developer and business trust: 4.0+ average
- Clear time savings documented (25-35%)
- Demonstrated quality improvements or parity
- Strong business case for broader rollout
- Team recommends continuation and expansion
- Documented best practices and lessons learned

#### 4.4 Red Flags (Trigger Re-evaluation)
- Developer satisfaction trending downward
- Developer trust below 3.0 for 2+ consecutive surveys
- Significant increase in PR comments or review time
- Higher bug rate than baseline for AI-assisted features
- Business stakeholders expressing concern about quality
- Team reducing usage of AI tools
- Accessibility or security issues in AI-generated code

### 5. Action Framework

#### 5.1 If Metrics Are Good
- Document what's working well
- Share best practices across teams
- Identify opportunities to expand usage
- Mentor other teams on effective AI usage

#### 5.2 If Metrics Need Improvement
- Conduct detailed retrospective with team
- Identify specific pain points or concerns
- Adjust AI usage patterns or prompts
- Provide additional training if needed
- Re-evaluate tooling or configuration
- Set specific improvement goals for next period

#### 5.3 If Metrics Are Poor
- Immediate team workshop to understand issues
- Consider pause or scope reduction
- Bring in external expertise if needed
- Re-baseline expectations
- Document lessons learned
- Decide: fix issues or conclude pilot

### 6. Reporting Cadence

- **Weekly:** Automated metrics dashboard (PR comments, velocity)
- **Bi-weekly:** Survey collection and analysis
- **Monthly:** Comprehensive report with trends and recommendations
- **End-of-pilot:** Full retrospective and business case document

### 7. Data Privacy and Ethics

- Survey responses anonymized unless feedback is volunteered
- Focus on team-level metrics not individual performance
- No punitive use of data
- Transparent sharing of results with all participants
- Opt-out available for survey participation

## Document Maintenance

This specification should be reviewed and updated:
- At the start of each pilot phase
- When metrics indicate issues or exceptional results
- Based on team feedback about metric usefulness
- When new metrics become relevant

## References

- GOV.UK Service Manual: Measuring Success
- DORA Metrics Framework
- HMCTS Development Standards
- VIBE Pilot Overview Documentation
