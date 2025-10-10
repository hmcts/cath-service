# VIBE-69 Onboarding Form - UI/UX Specification

## User Story
**As a citizen, I want to onboard onto the system, so that I can use it.**

## Service Overview
This specification defines the user experience for a multi-page onboarding form that collects essential user information across eight distinct pages, following GOV.UK Design System principles and accessibility standards.

## User Journey Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Homepage  │───▶│ Start Page  │───▶│    Name     │───▶│Date of Birth│───▶│   Address   │───▶│    Role     │───▶│   Summary   │───▶│Confirmation │
│             │    │             │    │             │    │             │    │             │    │             │    │             │    │             │
│"See example │    │/onboarding/ │    │/onboarding/ │    │/onboarding/ │    │/onboarding/ │    │/onboarding/ │    │/onboarding/ │    │/onboarding/ │
│form" link   │    │start        │    │name         │    │date-of-birth│    │address      │    │role         │    │summary      │    │confirmation │
│             │    │             │    │             │    │             │    │             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Page Wireframes

### 1. Homepage Update

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Service Homepage                                                    │
│                                                                     │
│ Welcome to our service. Use this service to...                     │
│                                                                     │
│ [Start now]                                                         │
│                                                                     │
│ [See example form]                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Start Page (/onboarding/start)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Onboarding form example                                             │
│                                                                     │
│ Use this form to see how we collect information for onboarding.    │
│                                                                     │
│ Before you start                                                    │
│                                                                     │
│ You will need:                                                      │
│ • your personal details (name and date of birth)                   │
│ • your address                                                      │
│ • information about your role                                       │
│                                                                     │
│ It takes around 5 minutes to complete.                             │
│                                                                     │
│ [Start now]                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Name Page (/onboarding/name)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ What is your name?                                                  │
│                                                                     │
│ First name                                                          │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ Last name                                                           │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ [Continue]                                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Date of Birth Page (/onboarding/date-of-birth)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ← Back                                                              │
│                                                                     │
│ What is your date of birth?                                         │
│                                                                     │
│ For example, 27 3 1985                                              │
│                                                                     │
│ Day           Month         Year                                    │
│ ┌─────┐       ┌─────┐       ┌─────────┐                            │
│ │     │       │     │       │         │                            │
│ └─────┘       └─────┘       └─────────┘                            │
│                                                                     │
│ [Continue]                                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Address Page (/onboarding/address)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ← Back                                                              │
│                                                                     │
│ What is your address?                                               │
│                                                                     │
│ Address line 1                                                      │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ Address line 2 (optional)                                          │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ Town or city                                                        │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ Postcode                                                            │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ [Continue]                                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6. Role Page (/onboarding/role)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ← Back                                                              │
│                                                                     │
│ What is your role?                                                  │
│                                                                     │
│ ○ Frontend Developer                                                │
│                                                                     │
│ ○ Backend Developer                                                 │
│                                                                     │
│ ○ Test Engineer                                                     │
│                                                                     │
│ ○ Other                                                             │
│                                                                     │
│ [Show when "Other" is selected]                                     │
│ Please specify your role                                            │
│ ┌─────────────────────────────────────────┐                        │
│ │                                         │                        │
│ └─────────────────────────────────────────┘                        │
│                                                                     │
│ [Continue]                                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7. Summary Page (/onboarding/summary)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ← Back                                                              │
│                                                                     │
│ Check your answers                                                  │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Name                                         │ John Smith [Change]│ │
│ ├──────────────────────────────────────────────┼─────────────────────│ │
│ │ Date of birth                                │ 1 January 1990     │ │
│ │                                              │ [Change]           │ │
│ ├──────────────────────────────────────────────┼─────────────────────│ │
│ │ Address                                      │ 123 Main Street    │ │
│ │                                              │ London             │ │
│ │                                              │ SW1A 1AA [Change]  │ │
│ ├──────────────────────────────────────────────┼─────────────────────│ │
│ │ Role                                         │ Frontend Developer │ │
│ │                                              │ [Change]           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Accept and submit]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8. Confirmation Page (/onboarding/confirmation)

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                              [Language Toggle]│
├─────────────────────────────────────────────────────────────────────┤
│ HMCTS Service Name                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ✓ Onboarding complete                                               │
│                                                                     │
│ Your onboarding has been submitted.                                 │
│                                                                     │
│ What happens next                                                   │
│                                                                     │
│ We will process your information and you will be able to access     │
│ the service.                                                        │
│                                                                     │
│ [Return to homepage]                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Form Structure and Validation

### Name Page
**Fields:**
- First name (required)
  - Input type: text
  - Max length: 50 characters
  - Validation: Must contain only letters, spaces, hyphens, and apostrophes
- Last name (required)
  - Input type: text
  - Max length: 50 characters
  - Validation: Must contain only letters, spaces, hyphens, and apostrophes

### Date of Birth Page
**Fields:**
- Day (required)
  - Input type: number
  - Min: 1, Max: 31
  - Validation: Must be valid day for given month/year
- Month (required)
  - Input type: number
  - Min: 1, Max: 12
- Year (required)
  - Input type: number
  - Min: 1900, Max: current year
  - Validation: User must be at least 16 years old

### Address Page
**Fields:**
- Address line 1 (required)
  - Input type: text
  - Max length: 100 characters
- Address line 2 (optional)
  - Input type: text
  - Max length: 100 characters
- Town or city (required)
  - Input type: text
  - Max length: 50 characters
- Postcode (required)
  - Input type: text
  - Validation: UK postcode format (e.g., SW1A 1AA)

### Role Page
**Fields:**
- Role selection (required)
  - Input type: radio buttons
  - Options: Frontend Developer, Backend Developer, Test Engineer, Other
- Other role specification (conditional)
  - Input type: text
  - Max length: 100 characters
  - Required only when "Other" is selected

## Content (English and Welsh)

### Homepage Updates

**English:**
- Link text: "See example form"
- Link destination: /onboarding/start

**Welsh:**
- Link text: "Gweld ffurflen enghreifftiol"
- Link destination: /onboarding/start

### Start Page Content

**English:**
- Page title: "Onboarding form example"
- H1: "Onboarding form example"
- Description: "Use this form to see how we collect information for onboarding."
- Section heading: "Before you start"
- Requirements list:
  - "your personal details (name and date of birth)"
  - "your address"
  - "information about your role"
- Duration: "It takes around 5 minutes to complete."
- Button: "Start now"

**Welsh:**
- Page title: "Enghraifft ffurflen ymgymryd"
- H1: "Enghraifft ffurflen ymgymryd"
- Description: "Defnyddiwch y ffurflen hon i weld sut rydym yn casglu gwybodaeth ar gyfer ymgymryd."
- Section heading: "Cyn i chi ddechrau"
- Requirements list:
  - "eich manylion personol (enw a dyddiad geni)"
  - "eich cyfeiriad"
  - "gwybodaeth am eich rôl"
- Duration: "Mae'n cymryd tua 5 munud i'w gwblhau."
- Button: "Dechrau nawr"

### Name Page Content

**English:**
- Page title: "What is your name?"
- H1: "What is your name?"
- First name label: "First name"
- Last name label: "Last name"
- Button: "Continue"

**Welsh:**
- Page title: "Beth yw eich enw?"
- H1: "Beth yw eich enw?"
- First name label: "Enw cyntaf"
- Last name label: "Cyfenw"
- Button: "Parhau"

### Date of Birth Page Content

**English:**
- Page title: "What is your date of birth?"
- H1: "What is your date of birth?"
- Hint text: "For example, 27 3 1985"
- Day label: "Day"
- Month label: "Month"
- Year label: "Year"
- Button: "Continue"

**Welsh:**
- Page title: "Beth yw eich dyddiad geni?"
- H1: "Beth yw eich dyddiad geni?"
- Hint text: "Er enghraifft, 27 3 1985"
- Day label: "Diwrnod"
- Month label: "Mis"
- Year label: "Blwyddyn"
- Button: "Parhau"

### Address Page Content

**English:**
- Page title: "What is your address?"
- H1: "What is your address?"
- Address line 1 label: "Address line 1"
- Address line 2 label: "Address line 2 (optional)"
- Town label: "Town or city"
- Postcode label: "Postcode"
- Button: "Continue"

**Welsh:**
- Page title: "Beth yw eich cyfeiriad?"
- H1: "Beth yw eich cyfeiriad?"
- Address line 1 label: "Llinell cyfeiriad 1"
- Address line 2 label: "Llinell cyfeiriad 2 (dewisol)"
- Town label: "Tref neu ddinas"
- Postcode label: "Cod post"
- Button: "Parhau"

### Role Page Content

**English:**
- Page title: "What is your role?"
- H1: "What is your role?"
- Option 1: "Frontend Developer"
- Option 2: "Backend Developer"
- Option 3: "Test Engineer"
- Option 4: "Other"
- Other field label: "Please specify your role"
- Button: "Continue"

**Welsh:**
- Page title: "Beth yw eich rôl?"
- H1: "Beth yw eich rôl?"
- Option 1: "Datblygwr Blaen"
- Option 2: "Datblygwr Cefn"
- Option 3: "Peiriannydd Prawf"
- Option 4: "Arall"
- Other field label: "Nodwch eich rôl"
- Button: "Parhau"

### Summary Page Content

**English:**
- Page title: "Check your answers"
- H1: "Check your answers"
- Row headers: "Name", "Date of birth", "Address", "Role"
- Change links: "Change"
- Button: "Accept and submit"

**Welsh:**
- Page title: "Gwiriwch eich atebion"
- H1: "Gwiriwch eich atebion"
- Row headers: "Enw", "Dyddiad geni", "Cyfeiriad", "Rôl"
- Change links: "Newid"
- Button: "Derbyn a chyflwyno"

### Confirmation Page Content

**English:**
- Page title: "Onboarding complete"
- H1: "Onboarding complete"
- Body text: "Your onboarding has been submitted."
- Section heading: "What happens next"
- Next steps: "We will process your information and you will be able to access the service."
- Button: "Return to homepage"

**Welsh:**
- Page title: "Ymgymryd wedi'i gwblhau"
- H1: "Ymgymryd wedi'i gwblhau"
- Body text: "Mae eich ymgymryd wedi'i gyflwyno."
- Section heading: "Beth sy'n digwydd nesaf"
- Next steps: "Byddwn yn prosesu eich gwybodaeth a byddwch yn gallu cael mynediad at y gwasanaeth."
- Button: "Dychwelyd i'r hafan"

## Error Messages

### Name Page Errors

**English:**
- Missing first name: "Enter your first name"
- Invalid first name: "First name must only include letters a to z, hyphens, spaces and apostrophes"
- Missing last name: "Enter your last name"
- Invalid last name: "Last name must only include letters a to z, hyphens, spaces and apostrophes"

**Welsh:**
- Missing first name: "Rhowch eich enw cyntaf"
- Invalid first name: "Rhaid i'r enw cyntaf gynnwys llythrennau a i z, cysylltnodau, bylchau ac collnodau yn unig"
- Missing last name: "Rhowch eich cyfenw"
- Invalid last name: "Rhaid i'r cyfenw gynnwys llythrennau a i z, cysylltnodau, bylchau ac collnodau yn unig"

### Date of Birth Errors

**English:**
- Missing day: "Enter a day"
- Invalid day: "Day must be between 1 and 31"
- Missing month: "Enter a month"
- Invalid month: "Month must be between 1 and 12"
- Missing year: "Enter a year"
- Invalid year: "Year must be between 1900 and current year"
- Invalid date: "Enter a real date"
- Under age: "You must be at least 16 years old"

**Welsh:**
- Missing day: "Rhowch ddiwrnod"
- Invalid day: "Rhaid i'r diwrnod fod rhwng 1 a 31"
- Missing month: "Rhowch fis"
- Invalid month: "Rhaid i'r mis fod rhwng 1 a 12"
- Missing year: "Rhowch flwyddyn"
- Invalid year: "Rhaid i'r flwyddyn fod rhwng 1900 a'r flwyddyn gyfredol"
- Invalid date: "Rhowch ddyddiad go iawn"
- Under age: "Rhaid i chi fod o leiaf 16 oed"

### Address Page Errors

**English:**
- Missing address line 1: "Enter address line 1"
- Missing town: "Enter a town or city"
- Missing postcode: "Enter a postcode"
- Invalid postcode: "Enter a real postcode"

**Welsh:**
- Missing address line 1: "Rhowch linell cyfeiriad 1"
- Missing town: "Rhowch dref neu ddinas"
- Missing postcode: "Rhowch god post"
- Invalid postcode: "Rhowch god post go iawn"

### Role Page Errors

**English:**
- No selection: "Select your role"
- Missing other specification: "Enter your role"

**Welsh:**
- No selection: "Dewiswch eich rôl"
- Missing other specification: "Rhowch eich rôl"

## Back Navigation

All pages except the first (Start page) include a "Back" link that:
- Takes users to the previous page in the flow
- Preserves any data already entered
- Does not trigger validation on the current page
- Uses browser history to maintain expected behavior

**Back navigation flow:**
- Start page: No back link
- Name page: Back to start page
- Date of birth page: Back to name page
- Address page: Back to date of birth page
- Role page: Back to address page
- Summary page: Back to role page
- Confirmation page: No back link (cannot return to summary after submission)

**Back link text:**
- English: "Back"
- Welsh: "Yn ôl"

## Clarified Requirements (Updated)

Based on user feedback, the following decisions have been made:

1. **Database Persistence**: ✅ Form submissions WILL be saved to the database for record keeping.

2. **User Authentication**: ✅ No authentication required - the form is open to anonymous users.

3. **Rate Limiting**: ✅ No rate limiting necessary for form submissions.

4. **Session Management**: ✅ Default session handling without specific timeout requirements.

5. **External Validation**: ✅ No external service validation needed for any fields.

6. **Date Format**: ✅ DD/MM/YYYY format is acceptable for date of birth.

7. **Address Validation**: ✅ No PAF (Postcode Address File) validation required - basic format validation only.

8. **Analytics/Tracking**: ✅ No analytics or tracking implementation required.

---

# Technical Implementation

## High-Level Technical Approach

This onboarding form will be implemented as a dedicated module in the Express.js monorepo, following the established patterns for multi-page forms with session-based state management. The implementation will use:

- **Server-side rendering** with Nunjucks templates for progressive enhancement
- **Session storage** for temporary form data across pages
- **GOV.UK Design System** components for consistent UI
- **Layered validation** with both client-side progressive enhancement and server-side enforcement
- **Type-safe data handling** with TypeScript throughout

The form will work without JavaScript (progressive enhancement principle) while providing enhanced user experience when JavaScript is available.

## File Structure and Routing

Following the monorepo conventions, the onboarding functionality will be implemented as a module under `libs/`:

```
libs/onboarding/
├── package.json                    # Module metadata with nunjucks build script
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts               # Test configuration
└── src/
    ├── pages/                      # Page controllers (auto-discovered routes)
    │   ├── onboarding/
    |   │   ├── start.ts                # GET for /onboarding/start
    |   │   ├── start.njk               # Start page template
    |   │   ├── name.ts                 # GET/POST for /onboarding/name
    |   │   ├── name.njk                # Name page template
    |   │   ├── date-of-birth.ts        # GET/POST for /onboarding/date-of-birth
    |   │   ├── date-of-birth.njk       # Date of birth template
    |   │   ├── address.ts              # GET/POST for /onboarding/address
    |   │   ├── address.njk             # Address page template
    |   │   ├── role.ts                 # GET/POST for /onboarding/role
    |   │   ├── role.njk                # Role page template
    |   │   ├── summary.ts              # GET/POST for /onboarding/summary
    |   │   ├── summary.njk             # Summary page template
    |   │   ├── confirmation.ts         # GET for /onboarding/confirmation
    |   │   └── confirmation.njk        # Confirmation page template
    ├── onboarding/                     # Business logic domain
    │   ├── service.ts                  # Core business logic
    │   ├── validation.ts               # Validation schemas and functions
    │   ├── queries.ts                  # Database operations (if persistence needed)
    │   ├── session.ts                  # Session data management
    │   └── navigation.ts               # Back/forward navigation logic
    │   └── models.ts                   # TypeScript interfaces and types
    └── assets/                         # Module-specific assets
        ├── css/
        │   └── onboarding.scss         # Custom styles for conditional fields
        └── js/
            └── onboarding.ts           # Role "Other" field toggle

### Homepage Link Addition

The homepage link will be added to the existing homepage template:

```
apps/web/src/pages/index.njk       # Add "See example form" link to /onboarding/start
```

## Session Management Approach

Form data will be stored in Express sessions with a clear namespace to avoid conflicts:

```typescript
// Session interface extension
interface OnboardingSession extends Session {
  onboarding?: {
    name?: {
      firstName: string;
      lastName: string;
    };
    dateOfBirth?: {
      day: string;
      month: string;
      year: string;
    };
    address?: {
      line1: string;
      line2?: string;
      town: string;
      postcode: string;
    };
    role?: {
      type: 'frontend' | 'backend' | 'test' | 'other';
      otherSpecification?: string;
    };
    isComplete?: boolean;
    submittedAt?: Date;
  };
}
```

### Session Management Strategy:
- **Data preservation**: Each page saves valid data to session before proceeding
- **Back navigation**: Session data populates forms when returning to previous pages
- **Validation state**: Invalid data is not saved to session
- **Cleanup**: Session data cleared after successful submission

## Form Validation Approach

### Server-Side Validation with Zod (Primary)
Each page will use Zod schemas for type-safe validation:

```typescript
// libs/onboarding/src/onboarding/validation.ts
import { z } from 'zod';

// Name page schema
export const nameSchema = z.object({
  firstName: z.string()
    .min(1, 'Enter your first name')
    .max(50, 'First name must be 50 characters or less')
    .regex(/^[a-zA-Z\s\-']+$/, 'First name must only contain letters, spaces, hyphens and apostrophes'),
  lastName: z.string()
    .min(1, 'Enter your last name')
    .max(50, 'Last name must be 50 characters or less')
    .regex(/^[a-zA-Z\s\-']+$/, 'Last name must only contain letters, spaces, hyphens and apostrophes')
});

// Date of birth schema with age validation
export const dobSchema = z.object({
  day: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(
    z.number().min(1, 'Day must be between 1 and 31').max(31)
  ),
  month: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(
    z.number().min(1, 'Month must be between 1 and 12').max(12)
  ),
  year: z.string().regex(/^\d{4}$/).transform(Number).pipe(
    z.number().min(1900, 'Enter a valid year').max(new Date().getFullYear())
  )
}).refine((data) => {
  const date = new Date(data.year, data.month - 1, data.day);
  const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 16;
}, { message: 'You must be at least 16 years old' });

// Address schema
export const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Enter address line 1').max(100),
  addressLine2: z.string().max(100).optional(),
  town: z.string().min(1, 'Enter town or city').max(50),
  postcode: z.string()
    .min(1, 'Enter postcode')
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 'Enter a valid UK postcode')
    .transform(val => val.toUpperCase())
});

// Role schema with conditional validation
export const roleSchema = z.discriminatedUnion('roleType', [
  z.object({
    roleType: z.literal('frontend-developer')
  }),
  z.object({
    roleType: z.literal('backend-developer')
  }),
  z.object({
    roleType: z.literal('test-engineer')
  }),
  z.object({
    roleType: z.literal('other'),
    roleOther: z.string().min(1, 'Enter your role').max(100)
  })
]);

// Complete form schema for database submission
export const onboardingSubmissionSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  town: z.string(),
  postcode: z.string(),
  roleType: z.string(),
  roleOther: z.string().optional()
});

export type NameData = z.infer<typeof nameSchema>;
export type DobData = z.infer<typeof dobSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type RoleData = z.infer<typeof roleSchema>;
export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;
```

### Validation Rules Implementation:
- **Name fields**: Zod regex pattern for letters, spaces, hyphens, apostrophes only
- **Date of birth**: Zod refinement for date validity + minimum age 16 calculation
- **Address**: Zod required fields + UK postcode format regex validation
- **Role**: Zod discriminated union for conditional "other" field validation

### Client-Side Progressive Enhancement
Optional JavaScript enhancement for immediate feedback:
- **Real-time validation** on blur for individual fields
- **Date validation** as user types to prevent impossible dates
- **Postcode formatting** to add spaces in correct positions
- **Role "Other" field** show/hide based on selection

## Error Handling Implementation

### Error Display Strategy:
1. **Error Summary**: GOV.UK error summary component at top of page
2. **Inline Errors**: Field-level error messages with GOV.UK styling
3. **Focus Management**: Automatic focus to error summary for accessibility
4. **Data Preservation**: Re-populate form fields with user input (except invalid data)

### Error Response Pattern with Zod:
```typescript
// Page controller error handling with Zod
import { nameSchema } from '../onboarding/validation.js';
import { formatZodErrors } from '../onboarding/error-formatter.js';

export const POST = async (req: Request, res: Response) => {
  const validation = nameSchema.safeParse(req.body);

  if (!validation.success) {
    const errors = formatZodErrors(validation.error);
    return res.render("onboarding/name", {
      errors,
      errorSummary: createErrorSummary(errors),
      data: req.body, // Preserve user input
      en: nameContentEn,
      cy: nameContentCy
    });
  }

  // Save validated data to session and continue
  req.session.onboarding = {
    ...req.session.onboarding,
    name: validation.data
  };

  res.redirect("/onboarding/date-of-birth");
};

// Error formatter helper
// libs/onboarding/src/onboarding/error-formatter.ts
import { ZodError } from 'zod';

export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    href: `#${err.path.join('-')}` // For error summary links
  }));
}
```

## Database Schema (Required)

✅ **Database persistence is REQUIRED** - submissions must be saved to PostgreSQL:

```prisma
model OnboardingSubmission {
  id              String   @id @default(cuid())
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  dateOfBirth     DateTime @map("date_of_birth")
  addressLine1    String   @map("address_line_1")
  addressLine2    String?  @map("address_line_2")
  town            String
  postcode        String
  roleType        String   @map("role_type")
  roleOther       String?  @map("role_other")
  submittedAt     DateTime @default(now()) @map("submitted_at")
  sessionId       String?  @map("session_id") // For debugging/support

  @@map("onboarding_submission")
  @@index([submittedAt])
}
```

### Data Storage Strategy:
- **Session during flow**: Form data stored in session while completing the form
- **Database on completion**: Final submission creates database record in PostgreSQL
- **No intermediate saves**: Reduces complexity and follows YAGNI principle
- **Database fields**: Store all collected data (name, dob, address, role) with submission timestamp

## Navigation and Routing Implementation

### URL Structure:
- All onboarding routes prefixed with `/onboarding/`
- Clean URLs matching page names (no `.html` extensions)
- Summary page allows direct access to any previous page via "Change" links

### Back Navigation Logic:
```typescript
// libs/onboarding/src/onboarding/navigation.ts
export function getPreviousPage(currentPage: string): string | null {
  const pageOrder = ['start', 'name', 'date-of-birth', 'address', 'role', 'summary'];
  const currentIndex = pageOrder.indexOf(currentPage);
  return currentIndex > 0 ? `/onboarding/${pageOrder[currentIndex - 1]}` : null;
}

export function getNextPage(currentPage: string): string {
  const pageOrder = ['start', 'name', 'date-of-birth', 'address', 'role', 'summary'];
  const currentIndex = pageOrder.indexOf(currentPage);
  return `/onboarding/${pageOrder[currentIndex + 1]}`;
}
```

### Summary Page Change Links:
Change links will redirect to specific pages with return context:
- URLs like `/onboarding/name?return=summary`
- After editing, redirect back to summary instead of continuing flow
- Preserve all session data during edit operations

## Progressive Enhancement Features

### JavaScript Enhancements:
1. **Role page "Other" field**: Show/hide based on radio selection
2. **Date input helpers**: Prevent invalid date entry
3. **Postcode formatting**: Auto-format UK postcodes
4. **Client-side validation**: Immediate feedback without server round-trip

### CSS Enhancements:
1. **Focus management**: Enhanced focus indicators
2. **Conditional field styling**: Smooth show/hide transitions for "Other" role field
3. **Mobile optimizations**: Touch-friendly form elements

## Testing Strategy

### Unit Tests:
- Validation functions with comprehensive edge cases
- Session helpers for data management
- Navigation logic for page flow

### E2E Tests with Playwright:
- Complete onboarding journey (happy path)
- Form validation error scenarios
- Back navigation and data preservation
- Accessibility testing with axe-core
- Welsh language journey
- JavaScript disabled testing

## Performance Considerations

### Optimization Strategies:
- **Minimal JavaScript**: Core functionality works without JS
- **Session storage**: Lightweight in-memory form state
- **Efficient templates**: Reusable Nunjucks macros
- **Progressive loading**: Only load enhancement JS when needed

### Monitoring Points:
- Session memory usage
- Form completion rates
- Error frequency by field
- Page load times for each step

## Security Considerations

### Input Sanitization:
- Server-side validation of all inputs
- HTML encoding of user data in templates
- CSRF protection via Express session tokens
- XSS prevention through Nunjucks auto-escaping

### Data Protection:
- Session data encrypted in transit (HTTPS)
- No sensitive data logging
- Session cleanup after completion


