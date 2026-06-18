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
/list-tickets
```

## What it does

Queries requirements.db for tickets with status='approved' and displays them sorted by priority with conflict analysis.

---

# Implementation

Query requirements.db and display approved tickets:

```
AGENT: general-purpose
DESCRIPTION: List available approved tickets
PROMPT:
"Query requirements.db for approved tickets ready to implement.

Database: requirements/requirements.db

**Step 1: Get approved tickets**

SELECT r.id, r.issue_number, r.ref, r.title, r.statement,
       r.granularity, r.priority
FROM requirement r
WHERE r.status = 'approved' AND r.issue_number IS NOT NULL
ORDER BY CASE r.priority
  WHEN 'highest' THEN 1
  WHEN 'high' THEN 2
  WHEN 'medium' THEN 3
  WHEN 'low' THEN 4
  WHEN 'lowest' THEN 5
  ELSE 6 END,
  r.issue_number ASC;

**Step 2: For each ticket, get requirement_link relationships**

For each ticket found, query ALL link types:

SELECT rl.type, rl.target_id, r2.ref, r2.title, r2.status, r2.issue_number
FROM requirement_link rl
JOIN requirement r2 ON r2.id = rl.target_id
WHERE rl.source_id = [ticket.id];

**Step 3: Display results with all links**

Format output as:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available Tickets (status=approved)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#312 (REQ-0042) - Add email notification system
  Priority: HIGH | Granularity: story
  Links: None
  → /qk-ship 312

#315 (REQ-0045) - Update user profile page
  Priority: HIGH | Granularity: story
  Links:
    • depends_on #312 (REQ-0042) [approved]
  ⚠️  Linked to other approved tickets - check before parallel work
  → /qk-ship 315

#320 (REQ-0050) - Add search functionality
  Priority: MEDIUM | Granularity: story
  Links: None
  → /qk-ship 320

#325 (REQ-0055) - Enhance notification templates
  Priority: MEDIUM | Granularity: story
  Links:
    • related_to #312 (REQ-0042) [approved]
    • blocks #330 (REQ-0060) [proposed]
  ⚠️  Linked to other tickets
  → /qk-ship 325

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found [N] approved tickets
[X] with no links (fully independent)
[Y] with links (check relationships before parallel work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Parallel Work Tips:**
- Tickets with no links can be worked on together safely
- Tickets linked by depends_on/blocks should not be worked on in parallel
- Tickets with related_to links may touch similar areas - coordinate if needed
- Use /qk-ship <number> to implement in isolated worktree

Return: 'Listed [N] approved tickets'"

WAIT FOR AGENT
```
