# VIBE-187: Educational Materials - Satisfaction & Trust

## Overview

This feature adds a user feedback mechanism to measure satisfaction and trust levels with court and tribunal educational materials. The system will collect anonymous feedback on publications to help improve the quality and usefulness of educational content.

## Business Context

The Courts and Tribunals Hearings (CaTH) service provides educational materials through publications. To ensure these materials meet user needs, we need to:

1. Measure user satisfaction with educational content
2. Assess trust levels in the information provided
3. Collect qualitative feedback for continuous improvement
4. Track satisfaction and trust metrics over time

## User Stories

### As a service user
- I want to provide feedback on educational materials I've read
- I want a simple, accessible way to rate my satisfaction
- I want to indicate my trust in the information provided
- I want to optionally provide additional comments
- I want the process to be quick and anonymous

### As a service administrator
- I want to view satisfaction and trust metrics
- I want to see trends over time
- I want to identify low-performing materials
- I want to read user comments for qualitative insights
- I want to export feedback data for reporting

## Functional Requirements

### 1. Feedback Collection

#### FR1.1: Satisfaction Rating
- Users can rate their satisfaction on a 5-point scale:
  - Very dissatisfied
  - Dissatisfied
  - Neither satisfied nor dissatisfied
  - Satisfied
  - Very satisfied
- Rating is mandatory to submit feedback
- Must work without JavaScript (progressive enhancement)

#### FR1.2: Trust Rating
- Users can rate their trust in the material on a 5-point scale:
  - No trust
  - Little trust
  - Some trust
  - Trust
  - Complete trust
- Rating is mandatory to submit feedback
- Must work without JavaScript (progressive enhancement)

#### FR1.3: Optional Comments
- Free-text comment field (max 1000 characters)
- Optional - users can submit without comments
- Character counter with progressive enhancement
- Input sanitization to prevent XSS

#### FR1.4: Anonymous Submission
- No user identification required
- No session tracking across submissions
- IP addresses not stored
- GDPR compliant

### 2. Feedback Storage

#### FR2.1: Database Schema
- Store feedback with:
  - Satisfaction rating (1-5)
  - Trust rating (1-5)
  - Optional comment text
  - Publication reference (artefact ID)
  - Submission timestamp
  - No personally identifiable information

#### FR2.2: Data Retention
- Feedback retained indefinitely for analysis
- No automatic deletion unless requested
- Compliant with data protection regulations

### 3. Admin Dashboard

#### FR3.1: Feedback Overview
- Display aggregate metrics:
  - Average satisfaction score
  - Average trust score
  - Total feedback submissions
  - Feedback over time (charts)
- Filter by date range
- Filter by publication type

#### FR3.2: Detailed Feedback View
- List individual feedback submissions
- Sort by date, satisfaction, or trust rating
- Search/filter by publication
- View associated comments
- Pagination for large datasets

#### FR3.3: Export Functionality
- Export feedback data to CSV
- Include all fields: ratings, comments, timestamps, publication references
- Date range filtering for exports

### 4. Integration Points

#### FR4.1: Publication Pages
- Feedback form embedded at bottom of publication pages
- Context-aware (knows which publication is being rated)
- Appears after user has scrolled/engaged with content

#### FR4.2: Success Confirmation
- Thank you page after submission
- Option to provide feedback on another publication
- No back button navigation to prevent duplicate submissions

## Non-Functional Requirements

### NFR1: Accessibility
- WCAG 2.2 AA compliant
- Screen reader compatible
- Keyboard navigation support
- High contrast mode support
- Works without JavaScript

### NFR2: Performance
- Feedback submission < 2 seconds response time
- Admin dashboard loads < 3 seconds
- No impact on publication page load times

### NFR3: Security
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS prevention
- CSRF protection
- Rate limiting to prevent spam (10 submissions per IP per hour)

### NFR4: Internationalization
- Full Welsh language support
- All text translated
- Character limits work for both languages
- Date formatting respects locale

### NFR5: Mobile Responsiveness
- Works on devices from 320px width
- Touch-friendly targets (minimum 44x44px)
- Optimized for mobile data usage

## Acceptance Criteria

### AC1: User Feedback Collection
- [ ] User can access feedback form on any publication page
- [ ] User can select satisfaction rating (1-5 scale)
- [ ] User can select trust rating (1-5 scale)
- [ ] User can optionally enter comments (max 1000 chars)
- [ ] Form validates all required fields
- [ ] Submission succeeds and shows confirmation
- [ ] Form works without JavaScript
- [ ] Form available in English and Welsh

### AC2: Admin Dashboard
- [ ] System admin can view aggregate satisfaction metrics
- [ ] System admin can view aggregate trust metrics
- [ ] System admin can view individual feedback submissions
- [ ] System admin can filter by date range
- [ ] System admin can filter by publication
- [ ] System admin can export data to CSV
- [ ] Dashboard accessible only to authenticated admins

### AC3: Data Storage
- [ ] Feedback stored in database with all required fields
- [ ] No PII stored
- [ ] Data persists across system restarts
- [ ] Database schema includes proper indexes for performance

### AC4: Accessibility & Security
- [ ] WCAG 2.2 AA compliance verified with axe-core
- [ ] Screen reader testing passed
- [ ] Keyboard navigation works throughout
- [ ] Input validation prevents XSS
- [ ] Rate limiting prevents spam
- [ ] CSRF tokens implemented

### AC5: Testing
- [ ] Unit tests for service layer (>80% coverage)
- [ ] E2E tests for user feedback flow
- [ ] E2E tests for admin dashboard
- [ ] Accessibility tests with Playwright + axe-core
- [ ] Load testing for admin dashboard with 1000+ feedback items

## Out of Scope

- Email notifications for new feedback
- User authentication for feedback submission
- Sentiment analysis on comments
- Real-time analytics/dashboards
- Mobile app integration
- Feedback on non-publication content
- Multi-language support beyond English and Welsh
- Integration with third-party analytics tools

## Technical Constraints

- Must use existing auth system (SSO) for admin access
- Must follow HMCTS monorepo patterns (libs/ structure)
- Must use Prisma for database operations
- Must use GOV.UK Design System components
- Must support PostgreSQL database
- No external dependencies beyond existing stack

## Dependencies

- Access to existing admin authentication system
- Publication module with artefact IDs
- Database migrations infrastructure
- Admin pages infrastructure

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Spam submissions | High | Medium | Implement rate limiting, CSRF tokens |
| Abusive comments | Medium | Low | Manual moderation in admin dashboard, report button |
| Database performance | Medium | Low | Proper indexing, pagination in queries |
| Low response rate | Low | Medium | Strategic placement, simple UX |

## Success Metrics

- 5%+ of publication viewers submit feedback
- Average satisfaction score > 3.5/5
- Average trust score > 3.5/5
- Admin dashboard used weekly by at least 2 admins
- 90%+ of feedback submissions successful
