# Spec Update Checklist

Use this checklist when reviewing a spec for updates. Work through each area and identify which sections need changing.

## Acceptance Criteria (Section 3)
- [ ] Do any Given/When/Then scenarios need to be added, removed, or reworded?
- [ ] Are there new edge cases that need their own scenario?
- [ ] Do any scenarios contradict decisions made since the spec was written?

## User Journey (Section 4)
- [ ] Has the flow changed (new steps, removed steps, different branching)?
- [ ] Are there new error paths or redirect rules?

## Wireframes (Section 5)
- [ ] Has the UI design changed significantly?
- [ ] Are new fields or components being added or removed?

## Content (Section 7)
- [ ] Have page titles, headings, or body text changed?
- [ ] Are there new error messages or help text to add?
- [ ] Do any Welsh translation markers (`[TRANSLATE: ...]`) need to be added for new content?

## Validation (Section 9)
- [ ] Are there new or changed validation rules?
- [ ] Have field constraints changed (max length, format, required/optional)?

## Navigation (Section 11)
- [ ] Have redirect targets changed?
- [ ] Are there new conditional navigation paths?

## Test Scenarios (Section 13)
- [ ] Do any new scenarios need to be captured?
- [ ] Are any existing scenarios now invalid?

## Assumptions & Open Questions (Section 14)
- [ ] Have any open questions been resolved? Update them with the decision.
- [ ] Are there new assumptions or questions to add?
