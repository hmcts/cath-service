---
description: List approved tickets from requirements.db
allowed-tools:
  - Bash
  - Read
  - Agent
---

# List Available Tickets

Query requirements.db for approved tickets ready to work on.

## Usage

```
/qk-tickets
```

## What it does

Queries requirements.db for tickets with status='approved' and displays them grouped by story points to show variety of ticket sizes.

---

# Implementation

Query requirements.db and display approved tickets:

```
AGENT: general-purpose
DESCRIPTION: List available approved tickets
PROMPT:
"Query requirements.db for approved tickets ready to implement.

Database: requirements/requirements.db

**Step 1: Build the local database**

Run `yarn requirements:build` to guarantee the local SQLite database matches the latest state of the committed SQL files.

**Step 2: Get approved tickets grouped by story points**

\`\`\`sql
SELECT r.id, r.issue_number, r.ref, r.title, r.statement,
       r.granularity, r.priority, r.story_points, r.assigned_to
FROM requirement r
WHERE r.status = 'approved' AND r.issue_number IS NOT NULL
ORDER BY 
  COALESCE(r.story_points, 999),  -- NULL story points last
  CASE r.priority
    WHEN 'highest' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    WHEN 'lowest' THEN 5
    ELSE 6 END,
  r.issue_number ASC;
\`\`\`

**Step 3: For each ticket, get requirement_link relationships**

For each ticket found, query ALL link types:

SELECT rl.type, rl.target_id, r2.ref, r2.title, r2.status, r2.issue_number
FROM requirement_link rl
JOIN requirement r2 ON r2.id = rl.target_id
WHERE rl.source_id = [ticket.id];

**Step 4: Display results grouped by story points**

Format output showing variety of ticket sizes:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Available Tickets (status=approved)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 LARGE (8+ points)
─────────────────────
#312 (REQ-0042) [8 pts] - Add email notification system
  Priority: HIGH | Granularity: story
  Links: None
  → /worktree-create 312

#320 (REQ-0050) [13 pts] - Admin dashboard with analytics
  Priority: MEDIUM | Granularity: epic
  Links:
    • blocks #325 (REQ-0055) [approved]
  ⚠️  Blocks other tickets
  → /worktree-create 320

🟡 MEDIUM (3-5 points)
─────────────────────
#315 (REQ-0045) [5 pts] - Update user profile page
  Priority: HIGH | Granularity: story
  Links:
    • depends_on #312 (REQ-0042) [approved]
  ⚠️  Depends on #312
  → /worktree-create 315

#325 (REQ-0055) [3 pts] - Enhance notification templates
  Priority: MEDIUM | Granularity: story
  Links:
    • related_to #312 (REQ-0042) [approved]
  ⚠️  Related to #312
  → /worktree-create 325

🟢 SMALL (1-2 points)
─────────────────────
#330 (REQ-0060) [2 pts] - Fix email validation bug
  Priority: HIGH | Granularity: task
  Links: None
  → /worktree-create 330

#335 (REQ-0065) [1 pt] - Update Welsh translations
  Priority: MEDIUM | Granularity: task
  Links: None
  → /worktree-create 335

⚪ NOT ESTIMATED
─────────────────────
#340 (REQ-0070) - Add search functionality
  Priority: LOW | Granularity: story
  Links: None
  ℹ️  Needs estimation - review issue on GitHub first
  → /ticket-check 340

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  🔴 Large (8+):    2 tickets (21 pts)
  🟡 Medium (3-5):  2 tickets (8 pts)
  🟢 Small (1-2):   2 tickets (3 pts)
  ⚪ Unestimated:   1 ticket

Total: 7 tickets, 32 story points available

💡 Suggested Combos:
  • 1 large + 2-3 small tasks
  • 2 medium + 1-2 small tasks
  • 1 medium + 3-4 small tasks

⚠️  Link Warnings:
  • #315 depends on #312 - don't work on both simultaneously
  • #320 blocks #325 - finish #320 first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return: 'Listed [N] approved tickets'"

WAIT FOR AGENT
```
