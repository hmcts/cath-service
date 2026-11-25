# #1592: Blob Explorer: separate actions to re-submit, send to Courtel, send to third party subscribers and send subscription email

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** junaidiqbalmoj
**Labels:** status:new, type:story
**Created:** 2026-11-20T09:46:53Z
**Updated:** 2026-11-24T09:24:17Z

## Description

## 1. User Story

**As a** System Admin
**I want to** choose what to resend for a publication from the Blob Explorer: everything, only the Courtel push, only the third-party subscriber push, or only the subscription emails
**So that** I can fix a missed or failed delivery to one channel without sending duplicates to the others

## 2. Background

The Blob Explorer has one **Re-submit subscription** button on the publication pages for JSON and flat-file publications. It leads to a "Confirm subscription re-submission" page and then a success page.

Today the button **does not send anything**. It only records an audit entry. Subscription emails and the Courtel push are sent when a publication is first processed. A push to the new third-party subscribers (OAuth API subscribers) has not been built yet, see #568.

This story replaces the single button with four actions, so a System Admin can resend to the right audience.

## 3. Acceptance Criteria

* **Scenario:** Four actions shown on the publication page
    * **Given** I am a System Admin viewing a publication in the Blob Explorer (JSON or flat file)
    * **When** the page loads
    * **Then** I see four buttons, in this order: **Re-submit subscription**, **Send to Courtel**, **Send to third party subscribers**, **Send subscription email**

* **Scenario:** Re-submit subscription sends to every channel
    * **Given** I am on the publication page
    * **When** I select **Re-submit subscription** and confirm
    * **Then** the subscription email is sent to every email subscriber for this publication (location, case and list type subscriptions)
    * **And** the publication is sent to Courtel, if Courtel is subscribed to this list type
    * **And** the publication is sent to every third-party subscriber subscribed to this list type at a matching sensitivity
    * **And** I see the success page for re-submission

* **Scenario:** Send to Courtel sends only to Courtel
    * **Given** I am on the publication page
    * **When** I select **Send to Courtel** and confirm
    * **Then** the publication is sent to Courtel only
    * **And** no subscription emails are sent and nothing is sent to third-party subscribers
    * **And** I see the success page for Courtel

* **Scenario:** Send to third party subscribers sends only to third-party subscribers
    * **Given** I am on the publication page
    * **When** I select **Send to third party subscribers** and confirm
    * **Then** the publication is sent only to the third-party subscribers subscribed to this list type at a matching sensitivity
    * **And** no subscription emails are sent and nothing is sent to Courtel
    * **And** I see the success page for third-party subscribers

* **Scenario:** Send subscription email sends only emails
    * **Given** I am on the publication page
    * **When** I select **Send subscription email** and confirm
    * **Then** the subscription email is sent to every email subscriber for this publication (location, case and list type subscriptions)
    * **And** nothing is sent to Courtel or to third-party subscribers
    * **And** I see the success page for subscription emails

* **Scenario:** Cancel on the confirmation page
    * **Given** I am on the confirmation page for any of the four actions
    * **When** I select **Cancel**
    * **Then** I return to the publication page and nothing is sent

* **Scenario:** No recipients for the chosen action
    * **Given** the chosen action has no recipients for this publication, for example Courtel is not subscribed to this list type
    * **When** I confirm
    * **Then** nothing is sent
    * **And** I see the error message for that action on the confirmation page

* **Scenario:** Sending fails
    * **Given** the chosen action cannot be completed, for example Courtel cannot be reached
    * **When** I confirm
    * **Then** I stay on the confirmation page with the error message for that action
    * **And** a failure in one channel during **Re-submit subscription** does not stop the other channels being sent

* **Scenario:** Every action is audited
    * **Given** I confirm any of the four actions
    * **When** the send is attempted
    * **Then** an audit log entry records which action was taken, for which artefact, and by whom

* **Scenario:** Only System Admins can use the actions
    * **Given** I am signed in without the System Admin role
    * **When** I try to open the confirmation page for any action
    * **Then** I am not allowed to see it

* **Scenario:** Welsh
    * **Given** I view the pages with the Welsh language selected
    * **Then** every button, heading, message and link is shown in Welsh

## 4. User Journey Flow

1. Go to System Admin dashboard → Blob Explorer → a location → a publication (JSON or flat file).
2. Select one of the four action buttons.
3. Check the publication summary on the confirmation page for that action, then select **Confirm**, or **Cancel** to go back.
4. See the success page for that action, with a link back to Blob Explorer – Locations.

## 5. Page Details

### 5.1 Publication page (JSON file and flat file)
* **Layout:** Today's page, with the single **Re-submit subscription** button replaced by four buttons. Each button starts its own confirmation. Re-submit subscription is the primary (green) button and the other three are secondary (grey) buttons.
* **Reference:** Existing Blob Explorer JSON file and flat file pages.
* **Content (English):** "Re-submit subscription", "Send to Courtel", "Send to third party subscribers", "Send subscription email"
* **Content (Welsh):** to be translated.
* **Navigation:** each button goes to the confirmation page for that action.

### 5.2 Confirmation page (one per action)
* **Layout:** Same as today's "Confirm subscription re-submission" page: heading, publication summary (Location Name, Publication Type, List Type, Provenance, Language, Sensitivity, Content Date, Display From, Display To), **Confirm** button, **Cancel** link. Only the heading, the page title and the error message change with the action.
* **Content:**

| Action | Heading and page title | Error message |
|---|---|---|
| Re-submit subscription | Confirm subscription re-submission | We could not re-submit this publication. Try again later. |
| Send to Courtel | Confirm send to Courtel | We could not send this publication to Courtel. Try again later. |
| Send to third party subscribers | Confirm send to third party subscribers | We could not send this publication to third party subscribers. Try again later. |
| Send subscription email | Confirm send subscription email | We could not send the subscription email for this publication. Try again later. |

* **Error messages, no recipients:**
  * Courtel: "Courtel is not subscribed to this list type, so nothing was sent."
  * Third party: "No third party subscribers are subscribed to this list type, so nothing was sent."
  * Email: "No one is subscribed to this publication, so no emails were sent."
* **Validation:** the publication must still exist. If it does not, show the existing "We could not re-submit this publication. Try again later." message.
* **Navigation:** **Confirm** goes to the success page for the action. **Cancel** goes back to the publication page.

### 5.3 Success page (one per action)
* **Layout:** Same as today's success page: a green panel, "What do you want to do next?" and a link to **Blob explorer – Locations**.
* **Content:**

| Action | Panel heading |
|---|---|
| Re-submit subscription | Submission re-submitted |
| Send to Courtel | Publication sent to Courtel |
| Send to third party subscribers | Publication sent to third party subscribers |
| Send subscription email | Subscription email sent |

## 6. Decisions (agreed in refinement)

* **Third-party subscribers (#568).** **Send to third party subscribers** ships as a visible button. This story builds the button, its confirmation page and its success page, and calls the third-party subscriber push that #568 delivers. **#1592 depends on #568 and is merged after it.** This story does not build its own version of that push.
* **Kill switches (#1494).** The buttons are always available, even if a channel has been switched off with its feature flag during the migration. A System Admin using them is making a deliberate manual send.
* **Courtel.** A resend is sent to Courtel as a **new** publication, not an update.
* **Display window.** The actions are always available, including for publications outside their display window: expired, or not yet displayed.
* **Duplicates.** **Re-submit subscription** and **Send subscription email** email every subscriber again, including people who received the original email. That is expected.


## Comments

No comments on this issue.
