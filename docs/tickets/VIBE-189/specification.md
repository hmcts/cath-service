# VIBE-189: Educational Materials - Efficiency

## Overview

This specification defines the requirements for creating educational documentation that explains efficiency metrics for AI coding tools (specifically Claude Code) in the context of the VIBE pilot programme. The materials will help stakeholders understand how to measure and interpret the efficiency of AI-assisted development.

## Purpose

To provide clear, accessible documentation that:
1. Defines key efficiency metrics for AI coding assistance
2. Explains how these metrics apply to the VIBE pilot
3. Establishes success criteria and benchmarks
4. Enables informed decision-making about AI coding tool adoption

## Target Audience

- HMCTS technical leadership evaluating AI coding tools
- VIBE pilot participants tracking their own efficiency gains
- Product managers assessing value and ROI
- Other government departments considering similar pilots
- Future teams adopting AI coding assistants

## Document Structure

### 1. Introduction
**Purpose**: Set context and explain why efficiency metrics matter

**Content Requirements**:
- Brief overview of the VIBE pilot objectives
- Importance of measuring efficiency in AI-assisted development
- How these metrics support evidence-based decision making
- Scope of the document (what it covers and what it doesn't)

**Length**: 2-3 paragraphs

### 2. Core Efficiency Metrics

#### 2.1 Tokens per Story Point

**Purpose**: Measure AI tool usage intensity relative to work delivered

**Content Requirements**:
- **Definition**: Total tokens consumed divided by story points completed
- **Calculation method**: How to extract token usage from Claude API logs
- **What it measures**: Efficiency of AI assistance relative to work complexity
- **VIBE pilot application**:
  - How story points are estimated in HMCTS projects
  - Expected token consumption ranges for different ticket types
  - Comparison baseline (if available from other teams/projects)
- **Interpretation guidance**:
  - Lower tokens/SP = more efficient AI usage OR simpler tickets
  - Higher tokens/SP = less efficient OR more complex tickets
  - Why this metric alone is insufficient
- **Limitations**:
  - Story point estimation variability between teams
  - Different ticket types (bug vs feature) consume different tokens
  - Learning curve impact on early measurements

#### 2.2 Lines of Code per Token

**Purpose**: Measure code generation efficiency of the AI tool

**Content Requirements**:
- **Definition**: Lines of code changed divided by tokens consumed
- **Calculation method**:
  - Using git statistics for LOC changes
  - Extracting token counts from Claude logs
  - Handling deletions vs additions
- **What it measures**: Code generation efficiency per token
- **VIBE pilot application**:
  - Expected LOC/token ratios for TypeScript/JavaScript development
  - Comparison between code generation vs documentation
  - Framework-specific considerations (Express.js, Nunjucks, Prisma)
- **Interpretation guidance**:
  - Higher LOC/token = more efficient code generation
  - Lower LOC/token = more conversation/planning OR complex refactoring
  - Context matters: refactoring has lower LOC/token than greenfield
- **Limitations**:
  - LOC is a poor quality metric
  - Deleting code is valuable but reduces this metric
  - Does not account for code quality or correctness

#### 2.3 Lines of Code per PR Count

**Purpose**: Measure development velocity and change granularity

**Content Requirements**:
- **Definition**: Total lines of code changed divided by number of pull requests
- **Calculation method**: Aggregating git statistics across PRs
- **What it measures**: Average PR size and development pace
- **VIBE pilot application**:
  - Expected PR sizes in HMCTS workflow
  - Comparison with pre-AI coding practices
  - Impact of AI assistance on PR granularity
- **Interpretation guidance**:
  - Context-dependent: larger PRs may indicate features, smaller = incremental
  - AI may enable larger, more confident changes
  - Very large PRs can indicate review bottlenecks
- **Limitations**:
  - Does not measure PR quality or review difficulty
  - Cultural/team practices heavily influence PR size
  - May incentivize wrong behaviors if used as a target

#### 2.4 Tokens per Time to Pass PR

**Purpose**: Measure AI efficiency relative to successful code integration

**Content Requirements**:
- **Definition**: Tokens consumed divided by time from PR creation to merge
- **Calculation method**:
  - Tracking PR lifecycle from GitHub API
  - Associating tokens with specific tickets/PRs
  - Handling multi-iteration PRs
- **What it measures**: AI assistance efficiency for shippable code
- **VIBE pilot application**:
  - Expected PR cycle times in HMCTS projects
  - Token usage patterns during PR feedback cycles
  - Comparison with manual development cycle times
- **Interpretation guidance**:
  - Lower tokens/time = efficient path to merged code
  - Higher tokens/time = more iterations OR complex review feedback
  - Measures both AI efficiency and human review process
- **Limitations**:
  - Review time depends on reviewer availability (not AI)
  - Does not account for post-merge issues
  - Complex features naturally take longer

### 3. Mapping Metrics to VIBE Pilot

**Purpose**: Connect abstract metrics to concrete pilot goals

**Content Requirements**:
- **Pilot objectives recap**: Briefly restate VIBE pilot goals
- **Metric alignment**:
  - Which metrics measure developer productivity gains
  - Which metrics measure AI tool efficiency
  - Which metrics inform cost-benefit analysis
- **Data collection approach**:
  - Where metrics data comes from (Claude API, GitHub, JIRA)
  - Collection frequency and timing
  - Privacy and anonymization considerations
- **Baseline establishment**:
  - Pre-pilot metrics (if available)
  - Industry benchmarks (if available)
  - Expected ranges for HMCTS context
- **Success indicators**: How metric changes indicate pilot success

### 4. Success Criteria - "What Does Good Look Like?"

**Purpose**: Define clear benchmarks for evaluating pilot success

**Content Requirements**:
- **Minimum viable success**: Threshold metrics that justify continued use
  - Example: "20% reduction in time to merged PR"
  - Example: "Maintained or improved code quality metrics"
- **Strong success indicators**: Metrics that indicate exceptional value
  - Example: "50% increase in story points delivered per sprint"
  - Example: "Positive developer satisfaction scores"
- **Warning signs**: Metrics that indicate problems
  - Example: "Token usage growing faster than output"
  - Example: "PR sizes increasing without quality improvement"
- **Qualitative considerations**:
  - Developer satisfaction and confidence
  - Code quality and maintainability
  - Onboarding and learning curve improvements
  - Accessibility and standards compliance
- **Time-based expectations**:
  - Week 1-2: Learning curve, metrics expected to be lower
  - Week 3-6: Efficiency gains should start appearing
  - Week 7+: Sustained improvements should be evident
- **Context-specific factors**:
  - Different metrics for different ticket types
  - Team size and composition impact
  - Technical debt vs greenfield development

### 5. Using These Metrics

**Purpose**: Provide practical guidance for applying metrics

**Content Requirements**:
- **Reporting cadence**: Weekly or bi-weekly metric reviews
- **Dashboard recommendations**: Key metrics to display
- **Analysis approach**:
  - Looking at trends over time vs absolute values
  - Comparing across team members (respectfully)
  - Identifying outliers and investigating causes
- **Decision-making framework**:
  - When metrics suggest process changes
  - When metrics suggest additional training
  - When metrics indicate pilot success or failure
- **Avoiding metric gaming**: How to prevent perverse incentives
- **Continuous improvement**: Using metrics to refine AI usage

### 6. Limitations and Caveats

**Purpose**: Ensure metrics are used appropriately

**Content Requirements**:
- **What metrics don't measure**:
  - Code quality and correctness
  - Developer learning and growth
  - Innovation and creative problem-solving
  - Team collaboration and communication
- **Risks of over-reliance on metrics**:
  - Gaming behaviors
  - Missing important qualitative factors
  - Demotivating developers
- **Complementary evaluation methods**:
  - Code reviews and quality assessments
  - Developer surveys and feedback
  - Stakeholder interviews
  - Production incident rates

### 7. References and Further Reading

**Purpose**: Provide context and additional resources

**Content Requirements**:
- Links to relevant research on AI coding assistants
- HMCTS service standards and quality criteria
- GOV.UK technology guidelines
- Claude Code documentation and best practices
- VIBE pilot charter and objectives

## Document Format

- **File format**: Markdown (.md)
- **Location**: `docs/educational-materials/efficiency-metrics.md`
- **Style**: Clear, professional, accessible to non-technical readers
- **Tone**: Informative, balanced, evidence-based
- **Length**: 3000-5000 words
- **Visual aids**: Include diagrams, tables, and examples where helpful

## Quality Standards

1. **Accuracy**: All technical definitions must be precise and correct
2. **Clarity**: Understandable by both technical and non-technical readers
3. **Completeness**: Cover all four core metrics thoroughly
4. **Balanced**: Present both strengths and limitations of each metric
5. **Actionable**: Provide practical guidance for using metrics
6. **Evidence-based**: Reference research or data where available

## Success Criteria for this Documentation

- Technical leadership can explain efficiency metrics to stakeholders
- Pilot participants understand what metrics they should track
- Decision-makers have clear criteria for evaluating pilot success
- Documentation is referenced in pilot reviews and retrospectives
- Other government departments can use this as a template

## Related Work

This document complements:
- VIBE pilot proposal and charter
- Claude Code technical documentation
- HMCTS development standards and practices
- Government Digital Service (GDS) guidelines

## Maintenance

- **Review frequency**: Quarterly or after significant pilot learnings
- **Update triggers**: New metrics identified, benchmarks established, pilot scope changes
- **Owner**: VIBE pilot technical lead
