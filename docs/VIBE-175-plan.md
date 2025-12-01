# VIBE-175 Technical Implementation Plan

## Overview
This ticket requires fixing validation bugs in the existing media account creation feature. The implementation already exists in PR #137 but has failed testing due to incorrect error messages for invalid email and single-character names.

## Current Status
- ✅ Database schema exists (`media_application` table in `apps/postgres/prisma/schema.prisma`)
- ✅ Page controllers exist (`libs/public-pages/src/pages/create-media-account/`)
- ✅ File storage logic exists (`libs/public-pages/src/media-application/storage.ts`)
- ✅ Database queries exist (`libs/public-pages/src/media-application/repository/query.ts`)
- ❌ Validation error messages are incorrect (bugs in `libs/public-pages/src/pages/validation.ts`)

## Identified Bugs

### Bug 1: Full Name Validation Error Messages
**Location**: `libs/public-pages/src/pages/validation.ts:32-40`

**Current Code**:
```typescript
} else if (fullName.trim().length > 100) {
  errors.push({
    text: content.errorFullNameRequired,  // ❌ Wrong message
    href: "#fullName"
  });
} else if (!FULL_NAME_REGEX.test(fullName.trim())) {
  errors.push({
    text: content.errorFullNameRequired,  // ❌ Wrong message
    href: "#fullName"
  });
}
```

**Problem**:
- When fullName length > 100: Uses `errorFullNameRequired` instead of a length-specific message
- When fullName fails regex (e.g., single character "M"): Uses `errorFullNameRequired` instead of format-specific message

**Expected Behavior** (from screenshots):
- Invalid format/too short: "There is a problem - Your full name will be needed to support your application for an account"

### Bug 2: Email Validation Error Message
**Location**: `libs/public-pages/src/pages/validation.ts:43-48`

**Current Code**:
```typescript
if (!email || email.trim().length === 0 || !EMAIL_REGEX.test(email.trim())) {
  errors.push({
    text: content.errorEmailInvalid,
    href: "#email"
  });
}
```

**Current Message**: "There is a problem - Email address field must be populated"

**Expected Message** (from screenshots): "There is a problem - Enter an email address in the correct format, like name@example.com"

**Problem**: The `errorEmailInvalid` key exists but contains the wrong message text.

## Implementation Plan

### Step 1: Update English Content (en.ts)
**File**: `libs/public-pages/src/pages/create-media-account/en.ts`

**Required Changes**:
1. Update `errorFullNameRequired` to be more specific about the requirement
2. Update `errorEmailInvalid` to match the expected format message
3. Add new error keys if needed for different validation scenarios

**New Error Messages**:
```typescript
errorFullNameRequired: "There is a problem - Your full name will be needed to support your application for an account",
errorEmailInvalid: "There is a problem - Enter an email address in the correct format, like name@example.com",
```

### Step 2: Update Welsh Content (cy.ts)
**File**: `libs/public-pages/src/pages/create-media-account/cy.ts`

**Required Changes**:
1. Update Welsh translations for the same error keys
2. Ensure consistency with English changes

**Note**: Need to verify Welsh translations are correct. Current Welsh content should be reviewed.

### Step 3: Update Validation Logic (validation.ts)
**File**: `libs/public-pages/src/pages/validation.ts`

**Option A** (Simplest - Recommended):
Keep the same error message for all fullName validation failures since they all conceptually mean "provide a valid full name":

```typescript
// Lines 26-41: No changes needed
// All fullName errors already use errorFullNameRequired
// The issue is just the message text in en.ts
```

**Option B** (More specific):
Create separate error messages for each validation failure:
- `errorFullNameRequired` - when empty
- `errorFullNameTooLong` - when > 100 chars
- `errorFullNameInvalid` - when fails regex

**Recommendation**: Use Option A because:
1. Simpler implementation
2. Less translation work
3. The existing behavior is actually good UX - same error for "invalid name" regardless of why it's invalid
4. Matches the screenshot expectations

### Step 4: Update Unit Tests
**File**: `libs/public-pages/src/pages/validation.test.ts`

**Required Changes**:
1. Update test expectations for the new error messages
2. Add test case for single-character name (currently failing scenario)
3. Add test case for invalid email format (currently failing scenario)

**New Test Cases**:
```typescript
it("should return error for single character name", () => {
  const file: Express.Multer.File = { /* ... */ };
  const errors = validateForm("M", "john@example.com", "BBC News", "on", file, undefined, en);

  expect(errors).toHaveLength(1);
  expect(errors[0].text).toBe("There is a problem - Your full name will be needed to support your application for an account");
  expect(errors[0].href).toBe("#fullName");
});

it("should return error for invalid email format", () => {
  const file: Express.Multer.File = { /* ... */ };
  const errors = validateForm("John Smith", "xsfdfbhvu@ !!!!", "BBC News", "on", file, undefined, en);

  expect(errors).toHaveLength(1);
  expect(errors[0].text).toBe("There is a problem - Enter an email address in the correct format, like name@example.com");
  expect(errors[0].href).toBe("#email");
});
```

### Step 5: Update Nunjucks Template Tests
**File**: `libs/public-pages/src/pages/create-media-account/index.njk.test.ts`

**Required Changes**:
1. Review and update any hardcoded error message assertions
2. Ensure template tests match the new error messages

### Step 6: Verify Database Schema
**File**: `apps/postgres/prisma/schema.prisma`

**Current Schema** (Already implemented):
```prisma
model MediaApplication {
  id          String   @id @default(uuid()) @db.Uuid
  fullName    String   @map("full_name")
  email       String
  employer    String
  status      String   @default("PENDING")
  requestDate DateTime @default(now()) @map("request_date")
  statusDate  DateTime @default(now()) @map("status_date")

  @@map("media_application")
}
```

**Verification**:
- ✅ All required fields present
- ✅ Naming convention follows snake_case for DB
- ✅ UUID for id field
- ✅ Status defaults to PENDING
- ✅ Timestamps for requestDate and statusDate

**Action**: No changes needed - schema is correct.

## File-by-File Implementation Checklist

### Files to Modify

1. **libs/public-pages/src/pages/create-media-account/en.ts**
   - [ ] Update `errorFullNameRequired` message
   - [ ] Update `errorEmailInvalid` message

2. **libs/public-pages/src/pages/create-media-account/cy.ts**
   - [ ] Update Welsh translation for `errorFullNameRequired`
   - [ ] Update Welsh translation for `errorEmailInvalid`

3. **libs/public-pages/src/pages/validation.ts**
   - [ ] Review validation logic (no code changes if using Option A)
   - [ ] Verify error messages are correctly referenced

4. **libs/public-pages/src/pages/validation.test.ts**
   - [ ] Update existing test expectations
   - [ ] Add test for single-character name validation
   - [ ] Add test for invalid email format validation

5. **libs/public-pages/src/pages/create-media-account/index.njk.test.ts**
   - [ ] Review and update any hardcoded error message assertions

### Files to Verify (No Changes Expected)

1. **libs/public-pages/src/pages/create-media-account/index.ts** - Controller logic is correct
2. **libs/public-pages/src/pages/create-media-account/index.njk** - Template is correct
3. **libs/public-pages/src/pages/account-request-submitted/*** - Confirmation page is correct
4. **libs/public-pages/src/media-application/repository/query.ts** - Database query is correct
5. **libs/public-pages/src/media-application/storage.ts** - File storage is correct
6. **apps/postgres/prisma/schema.prisma** - Schema is correct

## Testing Strategy

### 1. Unit Tests
Run existing and new unit tests:
```bash
yarn test libs/public-pages/src/pages/validation.test.ts
yarn test libs/public-pages/src/pages/create-media-account/index.test.ts
```

**Expected Results**:
- All validation tests pass with new error messages
- Controller tests pass (no changes expected)
- Template tests pass

### 2. Manual Testing Scenarios

| Scenario | Input | Expected Error | Status |
|----------|-------|----------------|--------|
| Empty name | fullName: "" | "Your full name will be needed to support your application for an account" | ✓ Should pass |
| Single char name | fullName: "M" | "Your full name will be needed to support your application for an account" | ❌ Currently fails |
| Name too long | fullName: 101+ chars | "Your full name will be needed to support your application for an account" | ✓ Should pass |
| Invalid name chars | fullName: "123!@#" | "Your full name will be needed to support your application for an account" | ✓ Should pass |
| Empty email | email: "" | "Enter an email address in the correct format, like name@example.com" | ❌ Currently fails |
| Invalid email | email: "xsfdfbhvu@ !!!!" | "Enter an email address in the correct format, like name@example.com" | ❌ Currently fails |
| Valid inputs | All valid | No errors, redirect to confirmation | ✓ Should pass |

### 3. E2E Testing
**File**: Create new E2E test or update existing one

**Test Flow**:
1. Navigate to `/create-media-account`
2. Enter single character in name field: "M"
3. Enter invalid email: "xsfdfbhvu@ !!!!"
4. Enter valid employer: "Test Employer"
5. Upload valid file
6. Check terms checkbox
7. Submit form
8. Verify error summary shows both errors with correct messages
9. Verify inline errors show correct messages
10. Verify field values are retained

### 4. Accessibility Testing
- Run axe-core checks on error states
- Verify screen readers announce errors correctly
- Verify keyboard navigation works with errors displayed

## Validation Rules Reference

### Full Name
- **Required**: Yes
- **Min length**: 2 characters (inferred from regex behavior)
- **Max length**: 100 characters
- **Pattern**: Alphabetic characters, spaces, hyphens, apostrophes, commas, periods
- **Regex**: `/^[a-zA-Z\s\-',.]+$/`

### Email
- **Required**: Yes
- **Pattern**: RFC-compliant email format
- **Regex**: `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`

### Employer
- **Required**: Yes
- **Max length**: 120 characters

### ID Proof File
- **Required**: Yes
- **Allowed types**: .jpg, .jpeg, .pdf, .png
- **Max size**: 2MB

### Terms Accepted
- **Required**: Yes
- **Value**: Must be "on" (checkbox checked)

## Potential Risks & Edge Cases

### 1. Welsh Translation Accuracy
**Risk**: Welsh error messages may not be accurate translations
**Mitigation**:
- Review Welsh translations with native speaker or approved translation service
- Check if there's a glossary of approved HMCTS Welsh translations

### 2. Regex Pattern for Names
**Risk**: Current regex `/^[a-zA-Z\s\-',.]+$/` may be too restrictive for some valid names
**Examples that would fail**:
- Names with numbers: "John Smith III"
- Names with accented characters: "José García"
**Mitigation**:
- Document this as a known limitation
- Consider expanding regex if feedback indicates it's a problem
- Current requirement says "alphabetic + spaces + common punctuation" so this is within spec

### 3. Email Regex vs RFC Compliance
**Risk**: Current regex may not match all RFC-compliant emails
**Mitigation**:
- Current regex is reasonable for common cases
- Consider using a library like `validator` for more robust email validation if issues arise
- Document that extremely unusual but technically valid email formats may be rejected

### 4. File Storage Location
**Risk**: `/storage/temp/files` may not exist in all environments
**Current Implementation**: `storage.ts` should handle directory creation
**Mitigation**: Verify directory creation logic exists and works

### 5. Error Message Consistency
**Risk**: Other parts of the application may have different error message formats
**Mitigation**:
- Review other forms in the codebase for error message patterns
- Ensure consistency across the application
- All error messages in this feature start with "There is a problem -" which matches GOV.UK pattern

## Dependencies & Integration Points

### Internal Dependencies
1. **@hmcts/postgres** - Database client
   - Used in: `libs/public-pages/src/media-application/repository/query.ts`
   - Schema: `apps/postgres/prisma/schema.prisma`

2. **File System** - File storage
   - Directory: `/storage/temp/files`
   - Used in: `libs/public-pages/src/media-application/storage.ts`

3. **Express Session** - Form data and error persistence
   - Used in: `libs/public-pages/src/pages/create-media-account/index.ts`
   - Session keys: `mediaApplicationForm`, `mediaApplicationErrors`, `mediaApplicationSubmitted`

4. **Multer** - File upload handling
   - Type: `MulterRequest` interface in `model.ts`
   - Error handling: `fileUploadError` in validation

### External Dependencies
1. **GOV.UK Design System** - UI components
   - Error summary component
   - Error message pattern
   - Form components

2. **Nunjucks** - Template engine
   - Template: `libs/public-pages/src/pages/create-media-account/index.njk`

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate**:
   - Revert changes to `en.ts` and `cy.ts`
   - Restore original error messages

2. **Database**:
   - No rollback needed (schema unchanged)

3. **File Storage**:
   - No rollback needed (storage logic unchanged)

4. **Testing**:
   - Re-run full test suite
   - Verify reverted state matches pre-change behavior

## Definition of Done

- [ ] All unit tests pass
- [ ] New test cases added for failing scenarios
- [ ] Manual testing confirms correct error messages
- [ ] Welsh translations reviewed and approved
- [ ] E2E tests pass
- [ ] Accessibility checks pass
- [ ] Code review completed
- [ ] Documentation updated (this plan document)
- [ ] JIRA ticket updated with test results
- [ ] PR #137 updated or new PR created
- [ ] Changes merged to main branch
- [ ] Deployed to staging environment
- [ ] QA testing completed on staging
- [ ] Production deployment approved

## Implementation Time Estimate

- Content updates (en.ts, cy.ts): 30 minutes
- Test updates and additions: 1 hour
- Manual testing: 30 minutes
- E2E test creation/update: 1 hour
- Code review and revisions: 30 minutes
- **Total**: ~3.5 hours

## Additional Notes

### Why PR #137 Failed
The PR implemented all the functionality correctly but used incorrect error message text in the content files. The validation logic itself is sound - the bug is purely in the user-facing error messages.

### GOV.UK Design System Compliance
The error messages follow the GOV.UK pattern:
- Error summary titled "There is a problem"
- Error messages start with "There is a problem - "
- Inline errors next to fields
- Red border on invalid fields
- Errors retained when form is redisplayed

### Future Enhancements (Out of Scope)
1. Real-time validation (client-side)
2. Email verification via confirmation link
3. Admin interface for reviewing applications
4. Automated approval/rejection workflow
5. Email notifications to applicants
6. File preview before upload
7. Multiple file uploads
8. More lenient name validation (accented characters, etc.)
