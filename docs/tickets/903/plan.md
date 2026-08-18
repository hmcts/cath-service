# Plan: #903 Magistrate Standard List not showing Prosecuting authority in Email Summary

TEMPLATE SOURCE: n/a

## 1. Technical Approach

This is a **bug fix**, not a new page. CaTH ORG (the legacy system this codebase must
match) always renders the `Prosecuting authority` line for a case, showing an empty
value (`Prosecuting authority -`) when there is no authority. CaTH AI currently drops
the line entirely whenever the extracted authority string is falsy.

Root cause is in `extractCaseSummary()` in
`libs/list-types/magistrates-standard-list/src/email-summary/summary-builder.ts`
(the **case** loop, ~lines 47-50):

```typescript
if (prosecutor) {
  const authority = extractPartyName(prosecutor);
  if (authority) fields.push({ label: "Prosecuting authority", value: authority });
}
```

Two conditions gate the field being emitted: (a) a `PROSECUTING_AUTHORITY` party must
exist, and (b) the extracted name must be truthy. Both must be removed for the label to
always appear.

The downstream formatter `formatCaseSummaryForEmail` (`@hmcts/list-types-common`,
`libs/list-types/common/src/email-summary/case-summary-formatter.ts`) already renders
each field as `` `${field.label} - ${field.value}` ``. With an empty `value` this
produces `Prosecuting authority - `, which matches CaTH ORG. No formatter change is
required — the fix is confined to the summary builder.

**Strategy:** In the case loop, always push a `Prosecuting authority` field. Its value is
the extracted authority name, or an empty string when the authority is empty or the
prosecutor party is absent.

Scope is limited to the **case** loop. The **application** loop (`hearing.application`)
has no prosecuting authority concept and is unchanged. The ticket example
("Hearing type – Application", SJP reference `SJ236059885`, defendant Gerhold, Danielle)
is a case whose `hearingType` string is "Application", not an entry from the application
loop.

## 2. Implementation Details

Files to change:

- **`libs/list-types/magistrates-standard-list/src/email-summary/summary-builder.ts`**
  Replace the gated push in the case loop:

  ```typescript
  if (prosecutor) {
    const authority = extractPartyName(prosecutor);
    if (authority) fields.push({ label: "Prosecuting authority", value: authority });
  }
  ```

  with an unconditional push that preserves field ordering
  (Name, Prosecuting authority, Reference, Hearing type, Offence):

  ```typescript
  const authority = prosecutor ? extractPartyName(prosecutor) : "";
  fields.push({ label: "Prosecuting authority", value: authority });
  ```

- **`libs/list-types/magistrates-standard-list/src/email-summary/summary-builder.test.ts`**
  Add a test proving the field is emitted with an empty value when the prosecuting
  authority is empty/missing. Keep the existing
  "should include prosecuting authority for cases" test (value populated) as-is.

No changes to `@hmcts/list-types-common`, the formatter, models, locales, or schemas.
No numeric `listTypeId` is involved.

## 3. Error Handling & Edge Cases

- **Prosecutor party present, name empty** (individual/organisation details missing or
  blank): `extractPartyName` returns `""`; field emitted as `Prosecuting authority - `.
- **No prosecutor party at all** (`find` returns `undefined`): value defaults to `""`;
  field still emitted, matching CaTH ORG's consistent rendering. (See Open Questions.)
- **Individual prosecutor**: rendered as `Surname, Forenames` via `extractPartyName`
  (unchanged behaviour).
- **Organisation prosecutor**: rendered as `organisationName` (unchanged behaviour).
- **Welsh rendering**: labels here are literal English strings baked into the builder
  (as are "Name", "Reference", etc.); this fix introduces no new user-facing text and no
  new locale keys, so it does not change the existing Welsh position for this summary.

## 4. Acceptance Criteria Mapping

| CaTH ORG output | CaTH AI (after fix) |
|---|---|
| `Name – Gerhold, Danielle` | `Name - Gerhold, Danielle` |
| `Prosecuting authority -` | `Prosecuting authority - ` (empty value, label present) |
| `Reference – SJ236059885` | `Reference - SJ236059885` |
| `Hearing type – Application` | `Hearing type - Application` |
| `Offence – Appearance to make statutory declaration (SJP case)` | `Offence - Appearance to make statutory declaration (SJP case)` |

The label now appears for every case regardless of whether the authority value is
present, so CaTH AI matches CaTH ORG.

## 5. CLARIFICATIONS NEEDED

- **Label when no prosecutor party exists at all:** This plan always emits the label
  (empty value) for every case, matching CaTH ORG's consistent line-per-case rendering.
  Confirm CaTH ORG shows `Prosecuting authority -` even when no `PROSECUTING_AUTHORITY`
  party is present, versus only when the party exists but has an empty name. If CaTH ORG
  only shows it when the party exists, the fix should instead be gated on
  `if (prosecutor)` and drop only the inner truthiness check.
- **Empty-value rendering exactness:** The formatter emits a trailing space
  (`Prosecuting authority - `) because the template is `` `${label} - ${value}` ``.
  Confirm this matches CaTH ORG (which displays `Prosecuting authority -`, likely with a
  trailing space trimmed in display). No trimming is planned unless required.
