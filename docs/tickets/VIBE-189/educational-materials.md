# Efficiency Metrics for AI Coding Tools: A Guide for the VIBE Pilot

## Introduction

The VIBE pilot programme at HMCTS evaluates Claude Code as an AI-powered coding assistant to improve developer productivity, code quality, and delivery velocity. To make evidence-based decisions about the tool's effectiveness and return on investment, we need clear, measurable efficiency metrics that capture both the value delivered and the resources consumed.

This document provides comprehensive guidance on four core efficiency metrics designed to evaluate AI coding tool performance within the VIBE pilot context. These metrics help answer critical questions: Is the AI tool making developers more productive? Are we using it efficiently? What does success look like? How do we balance speed with quality?

The document is structured to support multiple use cases: educating team members about the metrics, explaining our measurement approach to stakeholders, defining success criteria for the pilot, and providing practical guidance for collecting, analyzing, and acting on metric data. Whether you're a developer participating in the pilot, a technical leader evaluating results, or a decision-maker assessing ROI, this guide offers the context and tools needed to understand efficiency in AI-assisted development.

## Understanding Efficiency Metrics

Efficiency metrics in the context of AI coding assistance measure the relationship between resources consumed (primarily AI token usage and developer time) and value delivered (code produced, features shipped, problems solved). Unlike simple productivity metrics that only count output, efficiency metrics help us understand the quality and sustainability of that output.

The four core metrics we track in the VIBE pilot each illuminate a different aspect of efficiency:

1. **Tokens per Story Point** - Measures AI usage intensity relative to work complexity
2. **Lines of Code per Token** - Measures code generation efficiency per unit of AI consumption
3. **Lines of Code per PR Count** - Measures development velocity and change granularity
4. **Tokens per Time to Pass PR** - Measures AI efficiency in producing shippable code

Together, these metrics provide a balanced view that prevents over-optimization on any single dimension while capturing the multi-faceted nature of software development efficiency.

## Core Metric 1: Tokens per Story Point

### Definition

**Tokens per Story Point** measures the AI usage intensity required to complete work of a given complexity.

**Formula**: `Total Tokens Consumed ÷ Story Points Completed`

Where:
- **Tokens**: Combined input and output tokens from Claude API during ticket development
- **Story Points**: Fibonacci-scaled complexity estimates (1, 2, 3, 5, 8, 13, 21) assigned to JIRA tickets

### How to Calculate

**Data Sources**:
- Token usage: Extract from Claude API conversation logs associated with the ticket
- Story points: Retrieved from JIRA ticket fields at completion

**Calculation Steps**:
1. Identify all Claude conversations related to the ticket (via commit messages or PR links)
2. Sum input and output tokens from these conversations
3. Retrieve the story point estimate from the JIRA ticket
4. Divide total tokens by story points

**Example Calculation**:
```
Ticket: VIBE-234 (Implement user authentication)
Story Points: 8
Token Usage:
  - Initial implementation: 28,000 tokens
  - Bug fixes: 6,500 tokens
  - Documentation: 3,200 tokens
Total Tokens: 37,700

Tokens per Story Point: 37,700 ÷ 8 = 4,713 tokens/SP
```

### Application in VIBE Pilot

In the HMCTS context, story points represent technical complexity, uncertainty, and effort required. Different types of work consume tokens at different rates:

**Expected Ranges by Ticket Type**:
- **Simple CRUD operations** (2-3 SP): 15,000-25,000 tokens/SP
- **Standard feature development** (5-8 SP): 8,000-15,000 tokens/SP
- **Complex features with integration** (13-21 SP): 5,000-10,000 tokens/SP
- **Bug fixes** (1-3 SP): 5,000-15,000 tokens/SP (highly variable)
- **Refactoring work** (3-8 SP): 6,000-12,000 tokens/SP

These ranges reflect that larger, more complex tickets benefit from better AI context and more focused problem-solving, resulting in lower tokens per story point.

### Interpretation Guidelines

**Decreasing tokens/SP over time** (positive):
- Developers learning more effective prompting techniques
- Better understanding of when to use AI vs manual coding
- Improved codebase familiarity reducing context needed

**Increasing tokens/SP over time** (warning sign):
- Growing ticket complexity beyond initial estimates
- Inefficient AI usage patterns developing
- Excessive conversation without code generation
- May indicate training needs or tool misalignment

**High variability across tickets** (neutral to concerning):
- Expected variation between ticket types
- May indicate inconsistent story point estimation
- Could suggest some developers over-relying on AI while others under-utilize

**Very low tokens/SP** (<3,000, concerning):
- Possible under-utilization of AI capabilities
- May indicate developers avoiding the tool
- Could suggest simple tickets being over-estimated

### Limitations

This metric has important constraints that prevent it from standing alone:

1. **Story point subjectivity**: Different teams estimate differently, making cross-team comparison difficult
2. **Ticket type variation**: Comparing a bug fix to a feature implementation is not apples-to-apples
3. **Learning curve impact**: Early pilot metrics will be skewed by unfamiliarity
4. **Quality not measured**: Lower token usage doesn't guarantee better code
5. **Context accumulation**: Larger tickets may benefit from conversation history, skewing results

Always interpret this metric alongside quality indicators (code review feedback, defect rates) and other efficiency metrics.

### What Good Looks Like

**Minimum viable performance**:
- Tokens/SP stabilizes or decreases after week 3-4 of pilot
- Falls within expected ranges for ticket types
- Developers report feeling productive, not frustrated by token limits

**Strong performance**:
- 25-35% reduction in tokens/SP between weeks 2 and 8
- Consistent efficiency across different ticket types
- Team develops shared best practices that improve the ratio

**Warning signs requiring action**:
- Sustained increase in tokens/SP beyond week 4
- Ratios consistently 2x above expected ranges
- Wide variance between developers without clear explanation

## Core Metric 2: Lines of Code per Token

### Definition

**Lines of Code per Token** measures the code generation efficiency of the AI tool - how much code is produced per unit of AI consumption.

**Formula**: `Lines of Code Changed ÷ Total Tokens Consumed`

Commonly expressed as LOC per 1,000 tokens for readability.

Where:
- **Lines of Code**: Additions and modifications (not pure deletions) from git statistics
- **Tokens**: Combined input and output tokens from Claude API

### How to Calculate

**Data Sources**:
- LOC: Git commit statistics or GitHub PR data (`additions + modifications`)
- Tokens: Claude API conversation logs for the development period

**Calculation Steps**:
1. Extract PR or commit statistics from GitHub (additions, deletions, modifications)
2. Calculate net LOC: `(additions + modifications)`
3. Sum all tokens used during the development period
4. Divide LOC by tokens, multiply by 1,000 for readability

**Example Calculation**:
```
PR: #789 (Add email validation feature)
Git Stats:
  - Additions: +287 lines
  - Deletions: -34 lines
  - Net productive LOC: 287

Token Usage: 16,400 tokens

LOC per 1000 tokens: (287 ÷ 16,400) × 1,000 = 17.5 LOC/1000 tokens
```

### Application in VIBE Pilot

Different development activities produce code at different rates. Understanding these patterns helps interpret the metric correctly:

**Expected Ranges by Activity Type**:

| Activity Type | LOC per 1,000 Tokens | Explanation |
|--------------|----------------------|-------------|
| Greenfield code generation | 20-35 | Lots of boilerplate, straightforward implementation |
| Feature implementation | 15-25 | Mix of new code and integration with existing systems |
| Refactoring | 5-15 | High conversation ratio, careful restructuring |
| Bug fixes | 3-10 | Diagnosis-heavy, minimal code changes |
| Documentation | 20-40 | Plain text generation is highly efficient |
| Test writing | 18-28 | Structured, repetitive patterns |
| Complex algorithms | 8-15 | More planning and iteration needed |

**Language-Specific Considerations**:
- **TypeScript/JavaScript**: Verbose syntax increases LOC
- **JSON/YAML configs**: High LOC, low complexity
- **SCSS**: Nested structures inflate counts
- **Nunjucks templates**: HTML boilerplate increases LOC

### Interpretation Guidelines

**High LOC per token** (15-30+):
- Efficient code generation, often boilerplate or straightforward logic
- Good AI understanding of task requirements
- May indicate simpler tasks or well-structured prompts

**Low LOC per token** (5-15):
- Complex logic requiring iteration and refinement
- Significant conversation about architecture or approach
- Refactoring or careful modification of existing code
- May indicate exploratory work or learning phase

**Increasing LOC/token over time** (positive):
- Developers learning more effective prompting
- Better task decomposition leading to clearer instructions
- Growing codebase familiarity reducing context gathering

**Decreasing LOC/token over time** (concerning if sustained):
- Growing task complexity
- Over-reliance on conversation vs action
- Possible inefficient usage patterns

### Limitations

This is perhaps the most problematic metric if used in isolation:

1. **Lines of Code is a vanity metric**: More code is not better; concise, elegant solutions are preferable
2. **Deleting code is valuable**: Major refactoring that removes complexity shows as low LOC/token
3. **Boilerplate inflation**: Repetitive code patterns inflate the metric without adding value
4. **Language differences**: Verbosity varies drastically between languages
5. **Quality uncorrelated**: High output says nothing about correctness, maintainability, or elegance

**Critical**: This metric must always be viewed alongside code review quality feedback and post-merge defect rates. High LOC/token with low quality is worse than low LOC/token with excellent quality.

### What Good Looks Like

**Minimum viable performance**:
- LOC/token ratios fall within expected ranges for activity types
- Code quality remains high (no increase in review comments or bugs)
- Developers feel the tool is generating useful code

**Strong performance**:
- Ratios at the high end of expected ranges
- Consistent quality in code reviews
- Minimal post-generation editing needed

**Warning signs**:
- Very high LOC/token (>40) with quality concerns (possible untested boilerplate)
- Very low LOC/token (<5) without clear explanation (possible inefficient usage)
- Declining ratios alongside quality issues

## Core Metric 3: Lines of Code per PR Count

### Definition

**Lines of Code per PR Count** measures the average size of pull requests, indicating development velocity and change granularity.

**Formula**: `Total Lines of Code Changed ÷ Number of Pull Requests`

Where:
- **Lines of Code**: Additions + deletions from git statistics
- **PR Count**: Number of pull requests merged in the period

### How to Calculate

**Data Sources**:
- LOC: GitHub API PR statistics (additions + deletions)
- PR Count: GitHub repository PR data

**Calculation Steps**:
1. For each merged PR, extract additions and deletions
2. Calculate total LOC per PR: `additions + deletions`
3. Sum LOC across all PRs in the period
4. Divide by number of PRs

**Example Calculation**:
```
Sprint 4 PRs:
  - PR #445: 234 additions, 45 deletions = 279 LOC
  - PR #446: 567 additions, 89 deletions = 656 LOC
  - PR #447: 123 additions, 34 deletions = 157 LOC
  - PR #448: 445 additions, 112 deletions = 557 LOC

Total LOC: 279 + 656 + 157 + 557 = 1,649
Total PRs: 4

LOC per PR: 1,649 ÷ 4 = 412 LOC/PR
```

### Application in VIBE Pilot

Pull request size significantly impacts review quality, merge speed, and overall development flow. The VIBE pilot aims to understand whether AI assistance enables more focused, appropriately-sized PRs or tends to inflate them.

**HMCTS PR Size Guidelines**:

| Size Category | LOC Range | Review Time | Characteristics |
|--------------|-----------|-------------|-----------------|
| Micro | 1-50 | <15 min | Typo fixes, config tweaks |
| Small | 50-200 | 15-30 min | Focused bug fixes, minor features |
| Optimal | 200-400 | 30-60 min | Single feature, well-scoped |
| Large | 400-800 | 1-2 hours | Complex feature, multiple files |
| Very Large | 800-1500 | 2-4 hours | Major feature, requires segmentation |
| Excessive | >1500 | >4 hours | Should be broken up |

**AI Impact Expectations**:
- AI should enable developers to tackle larger, more confident changes
- But PRs should not grow excessively large due to unfiltered AI output
- Ideal: Shift from "Small" to "Optimal" category, not "Optimal" to "Excessive"

### Interpretation Guidelines

**Optimal range (200-400 LOC)**:
- Reviewable in reasonable time
- Cohesive change focused on single objective
- Balances thoroughness with manageability

**Too small (<100 LOC, consistently)**:
- May indicate excessive fragmentation
- Multiple PRs where one would suffice
- Possible over-caution or misunderstanding of scope

**Too large (>800 LOC, consistently)**:
- Review bottleneck risk
- Higher chance of bugs slipping through
- Difficult to provide thorough feedback
- May indicate scope creep or poor planning

**High variability (mixed sizes)**:
- Expected and healthy
- Different tasks naturally require different PR sizes
- Bug fixes vs features have different scales

### Limitations

1. **Context dependency**: A 1000-LOC refactoring PR may be appropriate; a 1000-LOC feature might not be
2. **Language inflation**: Verbose languages naturally produce larger PRs
3. **Generated file impact**: Auto-generated Prisma clients, migrations inflate counts
4. **Cultural variation**: Teams have different norms and practices
5. **Not a quality metric**: Smaller PRs aren't automatically better

This metric primarily serves as a health check for development flow, not a target to optimize against.

### What Good Looks Like

**Minimum viable performance**:
- Average PR size in optimal range (200-400 LOC)
- No consistent review bottlenecks due to PR size
- PRs remain focused on single objectives

**Strong performance**:
- Distribution centered in optimal range with appropriate variance
- Reviewers consistently complete reviews within expected timeframes
- Developers self-regulate PR scope effectively

**Warning signs**:
- Sustained trend toward very large PRs (>800 LOC average)
- Review cycle times increasing due to PR size
- Multiple PRs per ticket indicating forced fragmentation

## Core Metric 4: Tokens per Time to Pass PR

### Definition

**Tokens per Time to Pass PR** measures AI efficiency in producing code that successfully passes review and merges - the ultimate measure of "shippable code per token."

**Formula**: `Total Tokens Consumed ÷ Time from PR Creation to Merge (hours)`

Where:
- **Tokens**: All tokens used during PR development, including revisions
- **Time to Pass PR**: Hours from PR creation (`created_at`) to merge (`merged_at`)

### How to Calculate

**Data Sources**:
- Tokens: Claude API logs mapped to PR development window
- PR timing: GitHub API timestamps (`created_at`, `merged_at`)

**Calculation Steps**:
1. Identify PR creation and merge timestamps from GitHub
2. Calculate elapsed time in hours: `(merged_at - created_at) / 3600`
3. Sum all tokens used during this period (including revision work)
4. Divide tokens by hours

**Example Calculation**:
```
PR: #567 (Implement password reset flow)

Timeline:
  - Created: 2024-11-20 09:00 UTC
  - Merged: 2024-11-20 17:30 UTC
  - Elapsed: 8.5 hours

Token Usage:
  - Initial implementation: 22,000 tokens
  - Review feedback iteration: 4,500 tokens
  - Test improvements: 3,200 tokens
  - Total: 29,700 tokens

Tokens per hour: 29,700 ÷ 8.5 = 3,494 tokens/hour
```

### Application in VIBE Pilot

This metric captures the full cycle from starting work to delivering merged code, including any review-feedback iterations. It reflects both AI efficiency and code quality (faster approval suggests fewer issues).

**Expected Ranges by PR Complexity**:

| PR Category | Time to Merge | Tokens/Hour | Interpretation |
|------------|---------------|-------------|----------------|
| Fast track | <4 hours | 1,000-3,000 | Quick, straightforward changes |
| Standard | 4-24 hours | 500-1,500 | Normal review cycle |
| Complex | 24-72 hours | 200-800 | Multiple review rounds |
| Extended | >72 hours | <200 | Significant rework or delays |

**Factors Affecting Time to Merge**:
- Reviewer availability (not AI-related)
- Code complexity requiring deeper review
- Quality of initial submission (AI impact)
- Number of review iterations needed (AI impact)
- CI/CD pipeline duration (not AI-related)

**Isolating AI Impact**:
To understand AI efficiency separate from review delays, consider tracking:
- Tokens used before PR creation (initial implementation)
- Tokens used after review feedback (iteration)
- Ratio of iteration tokens to initial tokens (lower is better)

### Interpretation Guidelines

**Low tokens per hour** (<500 for standard PRs):
- Efficient path to shippable code
- High-quality initial submission requiring minimal revision
- Effective AI usage producing review-ready code

**High tokens per hour** (>2,000 for standard PRs):
- Multiple revision cycles
- Possibly rushed initial submission
- May indicate unclear requirements or poor prompting

**Decreasing tokens/hour over time** (positive):
- Developers learning to produce better initial submissions
- Improved prompt engineering leading to cleaner code
- Better understanding of review expectations

**Increasing tokens/hour over time** (concerning):
- Quality may be declining
- Rushed submissions requiring more rework
- Possible tool misalignment with team standards

### Limitations

1. **Review availability dominates timing**: Reviewer schedules impact time to merge more than AI efficiency
2. **Does not measure post-merge issues**: Fast merge doesn't guarantee production quality
3. **Complex features naturally take longer**: Time to merge correlates with scope
4. **Weekend/holiday effects**: Non-working time inflates the metric
5. **Multiple simultaneous PRs**: Token attribution becomes complex

**Recommendation**: Segment by PR type and track trends over time rather than comparing absolute values.

### What Good Looks Like

**Minimum viable performance**:
- Token/hour ratios within expected ranges for PR types
- No increase in review cycles or rework frequency
- Developers feel AI helps produce review-ready code

**Strong performance**:
- Declining token/hour ratios indicating improved efficiency
- Fewer review iterations (lower iteration/initial token ratio)
- Faster PR approval times without quality concerns

**Warning signs**:
- Increasing token/hour ratios over time
- Growing number of review cycles per PR
- Rising post-merge defect rates

## Mapping Metrics to VIBE Pilot Objectives

The VIBE pilot has specific objectives that these metrics help measure:

### Pilot Objective: Increase Developer Productivity

**Primary Metrics**:
- **Tokens per Story Point**: Measures efficiency of value delivery
- **LOC per PR Count**: Indicates development velocity

**Success Indicators**:
- 20-30% more story points delivered per sprint
- Stable or improving code quality metrics
- Developer satisfaction with productivity gains

### Pilot Objective: Reduce Time to Ship Features

**Primary Metrics**:
- **Tokens per Time to Pass PR**: Measures efficiency to merged code
- **LOC per PR Count**: Indicates development pace

**Success Indicators**:
- 25-35% reduction in PR cycle time
- Maintained or reduced defect rates
- Stakeholder perception of faster delivery

### Pilot Objective: Demonstrate ROI for AI Tooling

**Primary Metrics**:
- **Tokens per Story Point**: Correlates token costs to value delivered
- **All metrics combined**: Provides comprehensive efficiency picture

**Success Indicators**:
- Clear cost-benefit analysis showing positive ROI
- Sustained efficiency gains beyond learning curve
- Productivity gains exceed tooling costs

### Pilot Objective: Establish Best Practices

**Primary Metrics**:
- **All metrics tracked over time**: Identifies patterns and trends
- **LOC per Token**: Reveals effective usage patterns

**Success Indicators**:
- Documented patterns of efficient AI usage
- Team members converge on similar efficiency profiles
- Replicable practices that new users can adopt

## Data Collection and Privacy

### Collection Infrastructure

**Required Systems**:
- Claude API access with conversation logging enabled
- GitHub API access for PR and commit statistics
- JIRA API access for story point and ticket data
- Secure data storage with access controls

**Collection Frequency**:
- Claude API logs: Continuous collection, stored securely
- GitHub statistics: Extracted per PR upon merge
- JIRA data: Captured at sprint boundaries
- Metric calculation: Weekly for trending, monthly for reporting

### Privacy Considerations

**Aggregation Approach**:
- Primary reporting at team level, not individual
- Individual metrics visible only to developer and direct manager
- Anonymous examples used in shared retrospectives

**Data Minimization**:
- Token counts only, not conversation content
- Code statistics only, not full source code
- Aggregated trends preferred over raw data

**Consent and Transparency**:
- Developers informed about what data is collected
- Clear explanation of how metrics will be used
- Opt-in to individual performance tracking
- No punitive use of metrics during pilot phase

### Baseline Establishment

**Pre-Pilot Data** (if available):
- Story points delivered per sprint (last 3 sprints)
- Average PR cycle times (last 30 days)
- Code quality metrics (defect rates, review comments)

**Pilot Baseline** (weeks 1-2):
- Establishes "learning curve" reference point
- Not compared directly to pre-pilot (unfair due to learning)
- Used for measuring improvement within pilot

**Expected Trajectory**:
- Weeks 1-2: Below baseline (learning)
- Weeks 3-6: Approaching or exceeding baseline
- Weeks 7+: Sustained improvement

## Success Criteria: What Does Good Look Like?

### Minimum Viable Success

The pilot justifies continued use if these thresholds are met by week 8:

**Quantitative Thresholds**:
1. **Productivity**: 15-20% increase in story points delivered per sprint (quality maintained)
2. **Speed**: 20-25% reduction in average time from PR creation to merge
3. **Efficiency**: Tokens per story point stable or decreasing after week 4
4. **Quality**: No increase in post-merge defect rates or technical debt

**Qualitative Indicators**:
- Developer satisfaction scores ≥3.5/5
- Majority of developers actively choose to use the tool
- No significant complaints about tool friction or limitations
- Reviewers note no quality concerns in AI-assisted code

### Strong Success

The pilot demonstrates exceptional value if these indicators appear:

**Quantitative Indicators**:
1. **Productivity**: 35-50% increase in story points delivered
2. **Speed**: 40-50% reduction in PR cycle time
3. **Quality**: Measurable improvement in code quality metrics
4. **Efficiency**: 30-40% reduction in tokens/story point by month 3

**Qualitative Indicators**:
- Developer satisfaction scores ≥4.5/5
- Developers report significant confidence and capability gains
- New team members onboard noticeably faster
- Stakeholders observe clear velocity improvements
- Other teams request access to the tool

### Warning Signs Requiring Intervention

**Quantitative Red Flags**:
1. Tokens per story point increasing beyond week 4 (inefficient usage)
2. LOC per token decreasing below 5 without quality improvements
3. PR sizes growing beyond 800 LOC average (review bottleneck risk)
4. Time to pass PR increasing (quality or process issues)

**Qualitative Red Flags**:
- Developer frustration or resistance to tool usage
- Increased frequency of review comments about code quality
- Team members avoiding the tool for certain tasks
- Higher post-merge defect rates than pre-pilot
- Stakeholder concerns about delivery predictability

### Time-Based Expectations

**Weeks 1-2: Learning Curve**
- Metrics expected to be below baseline
- Higher token usage (exploration and learning)
- Longer PR cycles (unfamiliarity with workflow)
- This is normal and expected

**Weeks 3-6: Emerging Efficiency**
- Metrics should match or exceed baseline
- Token usage stabilizing
- PR cycle times decreasing
- Story points increasing
- Confidence growing

**Weeks 7+: Sustained Performance**
- Clear, consistent gains visible
- Token efficiency continuing to improve
- High developer satisfaction
- Benefits are self-evident

## Practical Application: Using These Metrics

### Dashboard Design

**Weekly Dashboard View**:
```
╔═══════════════════════════════════════════════════════════════╗
║             VIBE Pilot Efficiency Dashboard                   ║
║                    Week 7 | Nov 18-24, 2024                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tokens/Story Point:       8,200  ↓ 24% from baseline       ║
║  LOC/Token (per 1000):      19.6  ↑ 15% from baseline       ║
║  LOC/PR:                     342  → Stable (within range)    ║
║  Tokens/Time to Pass:     920/hr  ↓ 31% from baseline       ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                      Supporting Metrics                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Story Points Delivered:      39  ↑ 34% from baseline       ║
║  Avg PR Cycle Time:        16hrs  ↓ 38% from baseline       ║
║  Code Quality Score:        4.3/5 → Maintained              ║
║  Developer Satisfaction:    4.2/5 ↑ 0.3 from month 1        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Trend Visualization**: Track 8-week rolling trends with annotations for significant events (training sessions, tool updates, process changes).

**Segmentation Views**:
- By ticket type (feature vs bug vs refactor)
- By complexity (story point ranges: 1-3, 5-8, 13+)
- By developer (private, respectful, opt-in only)

### Analysis Approach

**Focus on Trends, Not Absolutes**:
- Week-over-week percentage change more meaningful than raw values
- Look for sustained direction over 3+ weeks
- Compare similar work types across time periods

**Outlier Investigation Protocol**:
1. Identify metrics >2 standard deviations from team average
2. Review ticket/PR details for context (was it unusually complex?)
3. Interview developer if pattern remains unclear
4. Document findings as learning opportunity (share anonymously)

**Respectful Comparison**:
- Never publicly rank developers by metrics
- Use anonymous examples in team discussions
- Focus on learning from effective patterns
- Provide 1-1 feedback, not public criticism
- Remember: Metrics measure behavior, not worth

### Decision-Making Framework

**When to Adjust Process**:
- Multiple developers show same inefficiency pattern
- Trend sustained over 3+ weeks
- Root cause analysis identifies process bottleneck
- Change proposal has team buy-in

**When to Provide Training**:
- Individual metrics diverge significantly from team
- Specific metric consistently outside expected range
- Developer expresses interest in improvement
- Clear training intervention available

**When to Evaluate Pilot Success**:
- Week 6: Preliminary assessment (are we on track?)
- Week 12: Full evaluation against success criteria
- Monthly: Stakeholder updates with trend data
- Quarterly: Comprehensive review and decision point

### Preventing Metric Gaming

**Potential Gaming Behaviors**:
- Artificially splitting PRs to manipulate LOC/PR
- Under-using AI to appear efficient on tokens/SP
- Rushing reviews to reduce time-to-pass
- Inflating story points to improve ratios

**Preventative Measures**:
1. **Multiple metrics**: No single metric determines success
2. **Quality gates**: Code quality must remain stable or improve
3. **Qualitative checks**: Developer surveys catch gaming behaviors
4. **Transparency**: Explain metric limitations upfront
5. **Team focus**: Emphasize collective improvement, not individual ranking

### Continuous Improvement

**Weekly Team Review**:
- Quick 15-minute metrics check-in
- Celebrate improvements
- Identify blockers or concerns
- Share one effective prompting technique

**Monthly Retrospective**:
- Review full month of data
- Identify trends and patterns
- Discuss challenges and solutions
- Update shared best practices document
- Adjust prompts or workflows based on learnings

**Quarterly Strategic Review**:
- Compare to pilot objectives
- Analyze cost-benefit (token costs vs productivity gains)
- Stakeholder report with recommendations
- Decision point: continue, expand, adjust, or discontinue

## Limitations and Complementary Evaluation

### What These Metrics Don't Measure

**Code Quality and Correctness**:
- Lines of code says nothing about elegance, maintainability, or correctness
- Fast PR approval doesn't guarantee bug-free production code
- High token usage might produce excellent, thoroughly-tested code

**Developer Learning and Growth**:
- Improved architectural thinking not captured in metrics
- Better problem-solving skills invisible to these measures
- Learning to prompt effectively is valuable but unmeasured

**Innovation and Creative Problem-Solving**:
- Novel solutions may require more exploration time and tokens
- Breakthrough approaches penalized by efficiency metrics
- Long-term technical debt reduction not immediately visible

**Team Collaboration and Culture**:
- Knowledge sharing between developers unmeasured
- Code review quality and mentorship invisible
- Morale, psychological safety, and job satisfaction separate

### Risks of Over-Reliance on Metrics

**Gaming Behaviors**: Developers may optimize for metrics rather than outcomes, choosing easier tickets, avoiding necessary refactoring, or fragmenting work unnaturally.

**Missing Context**: Numbers show "what" but not "why." A high token count might indicate inefficiency or thorough exploration of a complex problem. Context matters.

**Demotivating Developers**: Constant measurement can create anxiety, reduce autonomy, and diminish intrinsic motivation. Metrics should inform, not surveil.

**Quality Degradation**: Pressure to improve efficiency metrics may lead to cutting corners, reducing test coverage, or skipping documentation.

### Complementary Evaluation Methods

**Code Reviews and Quality Assessments**:
- Technical debt tracking (growing or shrinking?)
- Architecture review sessions
- Post-merge defect rates
- Code complexity metrics (cyclomatic complexity)
- Test coverage trends

**Developer Surveys and Feedback**:
- Weekly pulse surveys (1-2 questions)
- Monthly detailed feedback sessions
- Anonymous suggestion channels
- Retrospective discussions
- Open-ended qualitative feedback

**Stakeholder Interviews**:
- Product managers: velocity and predictability perception
- Tech leads: code quality and maintainability assessment
- Delivery managers: delivery confidence and flow
- End users: feature quality and reliability

**Production Metrics**:
- Incident rates and severity (stability)
- Performance and reliability (non-functional quality)
- User satisfaction scores (end-user value)
- Feature adoption and usage (value delivered)

**Holistic Evaluation**: The best pilot assessments combine quantitative efficiency metrics with qualitative feedback and production outcomes. Numbers tell you where to look; conversations tell you what you're seeing.

## References and Further Reading

### HMCTS Standards and Practices

- **HMCTS Service Standards**: Internal development and quality standards
- **GOV.UK Service Manual**: Government Digital Service guidelines for service delivery
- **Government Technology Standards**: Cross-government technology and architecture standards

### AI Coding Assistant Research

- **Anthropic Claude Documentation**: Technical documentation for Claude API and Code
- **GitHub Copilot Impact Studies**: Research on AI coding assistant effectiveness
- **Stack Overflow Developer Survey**: Annual survey including AI tool adoption and satisfaction

### Software Engineering Metrics

- **DORA Metrics**: Deployment frequency, lead time, change failure rate, recovery time
- **SPACE Framework**: Satisfaction, Performance, Activity, Communication, Efficiency
- **Accelerate (Book)**: Research-backed insights on software delivery performance

### VIBE Pilot Documentation

- **VIBE Pilot Charter**: Objectives, scope, and success criteria for the pilot programme
- **Claude Code Best Practices**: Internal documentation of effective usage patterns
- **Educational Materials Series**: Related documents on quality and satisfaction metrics

## Conclusion

Efficiency metrics provide valuable insights into AI coding tool performance, but they are guides, not absolutes. The four core metrics - Tokens per Story Point, LOC per Token, LOC per PR Count, and Tokens per Time to Pass PR - offer complementary perspectives on how effectively we're using Claude Code in the VIBE pilot.

Success means using these metrics to:
- Identify opportunities for improvement in our AI usage
- Validate that the tool is delivering value relative to cost
- Make evidence-based decisions about continued adoption
- Develop replicable best practices for other teams

Failure means:
- Treating metrics as targets to optimize against
- Ignoring qualitative feedback and context
- Using numbers to rank or judge developers
- Making decisions based on metrics alone

As the VIBE pilot progresses, these metrics will evolve. We'll discover which ones are most meaningful, what ranges are realistic for our context, and how to balance efficiency with quality, speed with sustainability, and measurement with trust.

The ultimate measure of success isn't a number - it's whether developers feel more capable, stakeholders see faster delivery of quality features, and HMCTS can confidently adopt AI coding tools to improve public service delivery.
