# Refinement Question Framework

Use these as a guide for probing questions during refinement. Do not ask them all at once — work through them conversationally and follow the thread.

## 1. Scope Clarity

- What is the **one thing** this ticket delivers? Can you state it in a single sentence?
- What is explicitly **out of scope**? Has that been stated in the issue?
- Is this the right size for a single ticket, or should it be split?
- Does the title accurately reflect what is being built?

## 2. User & Context

- Who is the **primary user** of this feature? Are there secondary users?
- What is the user trying to achieve? What happens if this feature doesn't exist?
- Is this user journey **new**, or a change to an existing one?
- Have real users been consulted, or is this assumption-driven?

## 3. Acceptance Criteria

- Can every acceptance criterion be **tested**? How would you know it passed?
- Are there **negative cases** missing — what happens when the user does something wrong?
- Are there **edge cases** not covered: empty states, maximum inputs, concurrent users, accessibility?
- Are the criteria **specific enough** to hand to an engineer without further clarification?

## 4. Dependencies & Risks

- Does this ticket **depend** on another issue being completed first? Is that captured?
- Are there **other tickets** that conflict with or overlap this one?
- Does this change affect **existing functionality** that other teams or users rely on?
- Are there **technical risks** (performance, data migration, third-party APIs) that need a spike first?

## 5. Welsh Language

- Does this feature include any **user-facing text** (headings, labels, error messages, notifications)?
- Has the Welsh equivalent been considered for all new content?

## 6. Non-Functional Requirements

- Are there **performance requirements** (load time, concurrent users)?
- Are there **accessibility requirements** beyond the standard WCAG 2.2 AA baseline?
- Are there **data retention or security** implications?

## 7. Definition of Done

- What does **done** look like for this ticket?
- Are there **documentation** or **notification** steps required after implementation?
- Who needs to **sign off** before this can go live?
