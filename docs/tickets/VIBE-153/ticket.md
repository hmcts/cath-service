# VIBE-153: Select a court or tribunal

## Ticket Information
- **Ticket ID**: VIBE-153
- **Title**: Select a court or tribunal
- **Type**: User Story
- **Status**: In Progress

## Description

### Problem Statement

All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve this.

**AS A** CaTH User
**I WANT** to select a court or tribunal
**SO THAT** I can view hearing information from specific venues

## Acceptance Criteria

1. All CaTH users have access to unrestricted published hearing information in CaTH
2. On the 'What court or tribunal are you interested in?' users can see a search bar
3. Users are able to type in the name of a preferred court or tribunal
4. When a user types in the search bar, the system will display likely options that correspond with the user's input
5. The user can make a selection from the displayed options by clicking on it
6. The user can continue the process by clicking the 'continue' button
7. The user can choose to click the 'select from an A-Z list of courts and tribunals' link to view all available venues
8. All CaTH pages specifications are maintained

---

## Technical Specification (Provided)

**Owner:** VIBE-153
**Date:** [Insert Date]
**Version:** 1.0

### 1. User Story

**As a** CaTH User
**I want** to select a court or tribunal
**So that** I can view hearing information from specific venues

#### Background

All CaTH users, including members of the public, must have access to unrestricted court and tribunal hearing lists. To support this, users should be able to search for a court or tribunal by name or browse an A-Z list of venues. This functionality will help users quickly find the correct venue and continue their journey to view specific hearing information.

#### Acceptance Criteria

1. All CaTH users have access to unrestricted published hearing information in CaTH.
2. On the **"What court or tribunal are you interested in?"** page, users can see a **search bar**.
3. Users are able to type in the name of a preferred court or tribunal.
4. When a user types in the search bar, the system displays **likely options** that match the user's input.
5. The user can make a **selection** from the displayed options by clicking on it.
6. The user can continue by clicking the **Continue** button.
7. The user can click the **"select from an A-Z list of courts and tribunals"** link to view all available venues.
8. All CaTH page specifications (header, footer, navigation, Welsh toggle, accessibility) are maintained.

### 2. User Journey Flow

1. User navigates to the **"What court or tribunal are you interested in?"** page.
2. User types in the search bar → system displays matching court/tribunal names.
3. User selects one option → confirmed as chosen venue.
4. User clicks **Continue** to proceed to the hearing list for that venue.
5. Alternatively, user clicks the **A-Z list link** to browse all courts/tribunals alphabetically.

### 3. Low-Fidelity Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ GOV.UK | Court and tribunal hearings                                │
│                                                        Sign in      │
│                                                        Cymraeg      │
├─────────────────────────────────────────────────────────────────────┤
│ What court or tribunal are you interested in?                       │
│                                                                     │
│ [Search bar]                                                        │
│ Suggested results:                                                  │
│ • Birmingham Magistrates' Court                                     │
│ • Bristol Crown Court                                               │
│ • Central London Family Court                                       │
│                                                                     │
│ [Continue]                                                          │
│                                                                     │
│ Or [select from an A-Z list of courts and tribunals]                │
├─────────────────────────────────────────────────────────────────────┤
│ Help | Privacy | Cookies | Accessibility | Contact | T&Cs | Welsh   │
│ Government Digital Service | Open Government Licence                │
│ © Crown copyright                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Page Specifications

#### Content

* **Heading**: "What court or tribunal are you interested in?"
* **Search bar**: For typing court/tribunal names.
* **Autocomplete suggestions**: Likely matches displayed as user types.
* **Continue button**: Proceeds with selected venue.
* **A-Z link**: Redirects to list of all courts/tribunals.

#### URL

* `/courts/search`

#### Validation

* Search input must be provided before continuing.
* If no option selected → error message displayed.

#### Error Messages

* "Enter a court or tribunal name"
* "Select a court or tribunal from the list"

### 5. Navigation

* **Forward**: Continue → selected venue's hearing list.
* **A-Z link**: Redirects to alphabetical list of courts/tribunals.
* **Back link**: Returns to previous page.
* **Footer links**: Standard CaTH footer (Help, Privacy, Cookies, Accessibility statement, Contact, Terms and Conditions, Welsh, Government Digital Service, Open Government Licence).

### 6. Accessibility

* Must comply with **WCAG 2.2 AA** and **GOV.UK Design System** standards.
* Search bar must be keyboard and screen-reader accessible.
* Autocomplete results must be announced to assistive technology.
* Clear focus states for Continue and A-Z links.
* Welsh toggle must reload content in Welsh.

### 7. Test Scenarios

1. **Page loads correctly**: Heading, search bar, Continue button, A-Z link visible.
2. **Search input**: User types valid court name → suggestions displayed.
3. **Select suggestion**: User clicks on suggestion → selection stored.
4. **Continue with selection**: User proceeds to hearing list for venue.
5. **No input**: Click Continue → error message displayed.
6. **Invalid input**: If no matches found → "No courts or tribunals found" message displayed.
7. **A-Z link**: Redirects to full list of courts/tribunals.
8. **Back link**: Returns to previous page.
9. **Welsh toggle**: Reloads page in Welsh.
10. **Footer links**: Navigate correctly to GOV.UK services.

### 8. Assumptions & Open Questions

* Confirm whether autocomplete matches partial words (e.g., "Birm" → Birmingham).
* Confirm the data source for the courts/tribunals list.
* Confirm maximum number of suggested results displayed.
* Confirm if search should be case-insensitive.

---

## Additional Requirements

### Mock Data Source

At present locations should not be stored in a database. Instead, use this file as mock data for the locations. The location details needed for this ticket are within the locations array:

```json
{
  "locations": [
    {
      "locationId": 1,
      "name": "Oxford Combined Court Centre",
      "welshName": "Oxford Combined Court Centre",
      "regions": [3],
      "subJurisidctions": [1, 4]
    },
    {
      "locationId": 9,
      "name": "Single Justice Procedure",
      "welshName": "Single Justice Procedure",
      "regions": [1, 2],
      "subJurisidctions": [7]
    }
  ],
  "regions": [
    {
      "id": 1,
      "name": "North East",
      "welshName": "North East"
    },
    {
      "id": 2,
      "name": "North West",
      "welshName": "North West"
    },
    {
      "id": 3,
      "name": "South East",
      "welshName": "South East"
    }
  ],
  "jurisidctions": [
    {
      "id": 1,
      "name": "Civil",
      "welshName": "Civil"
    },
    {
      "id": 2,
      "name": "Family",
      "welshName": "Family"
    },
    {
      "id": 3,
      "name": "Crime",
      "welshName": "Crime"
    }
  ],
  "sub-jurisidctions": [
    {
      "id": 1,
      "name": "Civil Court",
      "welshName": "Civil Court",
      "jurisdictionId": 1
    },
    {
      "id": 2,
      "name": "High Court",
      "welshName": "High Court",
      "jurisdictionId": 1
    },
    {
      "id": 3,
      "name": "Court of Appeal (Civil Division)",
      "welshName": "Court of Appeal (Civil Division)",
      "jurisdictionId": 1
    },
    {
      "id": 4,
      "name": "Family Court",
      "welshName": "Family Court",
      "jurisdictionId": 2
    },
    {
      "id": 5,
      "name": "High Court of the Family Division",
      "welshName": "High Court of the Family Division",
      "jurisdictionId": 2
    },
    {
      "id": 6,
      "name": "Crown Court",
      "welshName": "Crown Court",
      "jurisdictionId": 3
    },
    {
      "id": 7,
      "name": "Magistrates Court",
      "welshName": "Magistrates Court",
      "jurisdictionId": 3
    },
    {
      "id": 8,
      "name": "Court of Appeal (Criminal Division)",
      "welshName": "Court of Appeal (Criminal Division)",
      "jurisdictionId": 3
    }
  ]
}
```

### Code Organization

* **Location service code**: Should live within a new lib called `location` (`libs/location`)
* **UI related code**: Should live within `libs/public-pages`
