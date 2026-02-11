# #323: [VIBE-367] Third Party subscription Fulfilment - Current

**State:** OPEN
**Assignees:** None
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-367, tech-refinement
**Created:** 2026-01-29T16:02:45Z
**Updated:** 2026-02-11T12:28:00Z

## Description

> **Migrated from [VIBE-367](https://tools.hmcts.net/jira/browse/VIBE-367)**

**PROBLEM STATEMENT**

Third Party users can subscribe to receive publications from CaTH. This ticket covers the Third Party Subscription fulfilment process.



**AS A** CaTH Third Party Subscriber

**I WANT** to receive email notifications when hearing lists I'm subscribed to in CaTH are published

**SO THAT** I am aware when a new hearing list is published

**AND** can download a copy of this list



**Pre-Condition**
 * CaTH Third Party users can subscribe to receive specific hearing lists published in CaTH

 **TECHNIAL SPECIFICATION**
 * When we receive a publication via manual upload or api endpoint (json/flat file) for a specific list, it needs to send to the third party user (if subscriber to that list)
 * Get Third party url and certificate (trust store) from keyvault
 * As part of PUSH, following headers information also need to be added: x-provenance, x-source-artefact-id, x-type, x-list-type, x-content-date, x-sensitivity, x-language, x-display-from, x-display-to, x-location-name, x-location-jurisdiction and x-location-region. x-location-name, x-location-jurisdiction and x-location-region will come from reference data (location table). It also includes PDF generated for that list.
 * Retries three times if request fails.
 * If publication manually deleted, we send POST request with all the headers but body is blank.

**ACCEPTANCE CRITERIA**
 * When a CaTH Third Party user subscribes to publications in CaTH and a publication matching the users' subscriptions is uploaded to CaTH, the system fulfils the subscription by identifying the Third Party User ID subscribed to that publication.
 * The system retrieves the publication metadata from artefact table and sends the file in JSON format to the Third Party using the POST endpoint
 * The system should push the file to the third party their API (P&I push) using the third party authorisation certificate
 * An acknowledgment receipt should be issued in the form of a HTTP status return
 * Third Party Subscribers are notified when publications are uploaded, updated or manually deleted before expiry, using the correct status code
 * Successful <`**POST**`>(https://hmcts.github.io/restful~~api~~standards/#post) requests will generate:
 ** 200 (if resources have been updated)
 ** 201 (if resources have been created)
 ** 202 (if the request was accepted but has not been finished yet)
 *** 204 with <`**Location*`>(https://tools.ietf.org/html/rfc7231#section-7.1.2) header (if the actual resource is not returned)
 * Validation is established to ensure no publication is sent when the trigger has not been activated, to ensure that Non-subscribed JSON payload is not sent to the third party and to ensure that the system differentiates between newly uploaded and updated publication
 * Integration test and Unit test are performed

---

## Original JIRA Metadata

- **Status**: New
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 1/22/2026
- **Updated**: 1/23/2026
- **Original Labels**: CaTH, tech-refinement

## Comments

### Comment by OgechiOkelu on 2026-02-11T12:28:00Z
Note: Initial requirements may have been updated during the tech-refinement which need to be included in the technical plan and may require changes to the initially generated technical specifications during the development of the technical plan. @plan
