# #1380: Courtel push: match the legacy request format and headers (follow-up to #323)

**State:** OPEN
**Assignees:** RebeccaHayleyPickles
**Author:** RebeccaHayleyPickles
**Labels:** bug
**Created:** 2026-11-09T16:54:00Z
**Updated:** 2026-11-13T16:15:16Z

## Description

Follow-up to #323. The legacy Courtel push was built from the #323 ticket text. That text did not specify the request format, and the #323 plan's open question on it ("Should the PDF binary be included in the POST body as multipart/form-data, or is JSON-only sufficient?") was never answered. The push was tested against CaTH's own Courtel mock, not against what legacy sends. QA on #323 recorded the PDF and header problems ([test results](https://github.com/hmcts/cath-service/issues/323#issuecomment-4380504249)), and the issue was closed with them still open.

## 1. Goal
**System/Component:** `libs/legacy-third-party-fulfilment` (Courtel push)
**Objective:** Make the requests CaTH sends to Courtel match what legacy PIP sends, so Courtel receives the same thing after migration.

## 2. Technical Context
The source of truth is legacy `pip-publication-services`:
- `LegacyThirdPartyManagementService.handleThirdParty`
- `LegacyThirdPartyService`: `handleJsonThirdPartyCall`, `handlePdfThirdPartyCall`, `handleFlatFileThirdPartyCall`, `getHttpHeadersFromArtefact`

| | Legacy | CaTH today |
|---|---|---|
| JSON publication | **Two POSTs.** First the raw JSON, `application/json`. Then a multipart with a single `file` part named `<artefactId>.pdf`. An empty PDF is skipped. | **One** multipart with a `json` part and a `pdf` part named `publication.pdf` (`push/http-client.ts`) |
| Welsh PDF | For list types with an additional PDF and a non-English publication, the Welsh PDF is sent | Not sent |
| Flat file | Multipart, single `file` part named with `sourceArtefactId` | Single `file` part named with `sourceArtefactId` if it has an extension, otherwise `artefactId` |
| `x-provenance` | The artefact's provenance, but `CATH` on the PDF call | Always the artefact's provenance |
| `x-source-artefact-id` | `sourceArtefactId` | `artefactId` (`push/headers.ts`) |
| `x-type` | `artefact.type` | Hardcoded `"LIST"` |
| `x-content-date`, `x-display-from`, `x-display-to` | `LocalDateTime.toString()` of the stored values. Both display dates are always sent | Date only (`YYYY-MM-DD`) from the server's local-time getters. Display dates are omitted when null |
| `x-location-jurisdiction`, `x-location-region` | Every value, comma-joined | First value only |

The legacy column comes from reading its code, not from a capture of real traffic. Confirm it before building.

Since #1306 the push gets the PDF and flat file from blob storage, so the bodies now reach Courtel. Before that, every push with a PDF failed and flat files were sent empty. So, as far as the code shows, no deployed environment has sent Courtel the combined JSON-and-PDF multipart. The only bodies that could have arrived are raw JSON, when no PDF was generated, and empty flat-file posts. That makes this a good time to change the format, before Courtel comes to depend on it.

## 3. Scope of Work
* [ ] Confirm the expected format with whoever owns the Courtel integration. Ideally compare it with a legacy request captured in a lower environment.
* [ ] Send a JSON publication as two requests (JSON, then PDF), with legacy's part name, filename and `x-provenance: CATH` on the PDF call. Skip an empty PDF.
* [ ] Send the Welsh PDF where legacy does.
* [ ] Set `x-source-artefact-id` from `sourceArtefactId` and `x-type` from `artefact.type`.
* [ ] Send every jurisdiction and region, comma-joined.
* [ ] Match legacy's date header format. Format dates in UTC, or explicitly in Europe/London, rather than with the server's local-time getters.
* [ ] Decide how a failure is logged in `thirdPartyPushLog` when one of the two requests succeeds and the other fails.
* [ ] Update the CaTH Courtel mock (commit `cf6021e3`) to match.

## 4. Implementation Details
* **Service:** `libs/legacy-third-party-fulfilment` (`push/http-client.ts`, `push/headers.ts`, `service.ts`). Callers: `processPublication` and the display-from cron (`libs/publication`).
* **Dependency:** #1306 (Courtel files read from blob storage, and the display-from cron push) should merge first.
* **Impacted Areas:** the upload paths (manual, non-strategic and `POST /v1/publication`), the 1272 display-from cron, and the remove-list deletion push (headers only).
* Out of scope: the OAuth third-party push (#568, PR #1215).

## 5. Definition of Done (Technical)
* [ ] Requests match the confirmed legacy format, covered by unit tests for each publication shape (JSON with PDF, JSON with a Welsh PDF, JSON without a PDF, flat file, deletion).
* [ ] Unit test coverage is >80%.
* [ ] The format decisions are recorded in `docs/tickets/<issue>/plan.md`.
* [ ] Verified end to end against the Courtel test endpoint in a lower environment.

## 6. Security & Risks
* Courtel may have adapted to CaTH's combined format during testing. Confirm before changing it.
* A JSON publication now takes two requests, which doubles the retry and timeout exposure for each publication.
* Separately: the Courtel URL secret is named `auto-pip-stg-courtel-api` in all three charts (web, api, crons), but prod is expected to use `auto-pip-prod-courtel-api` (#1097).


## Comments

No comments on this issue.
