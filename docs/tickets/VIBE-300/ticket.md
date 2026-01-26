# VIBE-300: Subscribe by case name, case reference number, case ID or unique reference number (URN)

**Status:** In Progress
**Branch:** feature/VIBE-300
**Labels:** subscription, case-search, user-journey

## Description

Verified media users need the ability to subscribe to hearing lists by case-specific identifiers (case name, case reference number, case ID, or URN), not just by location. This enables users to receive email notifications for specific cases they are monitoring.

## User Story

**As a** verified media user
**I want** to subscribe to hearing lists in CaTH
**So that** I can receive email notifications whenever a list I subscribed to is published.

## Pre-conditions

- User has valid credentials and is approved as a verified media user
- Only published information is available for searching
- Email notifications are implemented in Gov Notify
- `artefact_search` table exists (from VIBE-316) with case data
- Subscription table has `search_type` and `search_value` columns (from VIBE-316)

## Dependencies

- **VIBE-316**: Case search infrastructure must be implemented first

## Attachments

- subscription process phase 2.docx

## Related Documentation

- [Specification](./specification.md) - Detailed user journey and technical requirements
- [Implementation Plan](./plan.md) - Phased implementation approach
- [Tasks](./tasks.md) - Detailed task breakdown
