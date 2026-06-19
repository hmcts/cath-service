# #745: Add PNC ID to Magistrate Standard List

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-06-18T12:04:26Z
**Updated:** 2026-06-19T15:47:54Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to add PNC ID field to the Magistrate's standard Validation schema & style guide.

To be added in schema and displayed like ASN (if available).

**AS A** Service

**I WANT** to update the Magistrate's standard Validation schema & style guide

**SO THAT** it aligns with the updated requirements

**ACCEPTANCE CRITERIA**

PNC ID to be added to the Magistrate's standard Validation schema, style guide (Mock Up attached), and the download PDF and CSV files.

PNC ID filed to be displayed under the ASN field in the front end/ style guide and as a non-mandatory field, it will follow the same business rules as the ASN field

## Comments

### Comment by OgechiOkelu on 2026-06-18T13:10:42Z
@spec

### Comment by hmctsclaudecode on 2026-06-18T13:16:01Z
# Technical Specification: Add PNC ID to Magistrates Standard List

**Issue:** #745 — Add PNC ID to Magistrate Standard List

## 1. User Story
**As a** Court and Tribunal Hearings (CaTH) service
**I want to** add a PNC ID field to the Magistrates Standard List validation schema, style guide, and the downloadable PDF and CSV files
**So that** published Magistrates Standard Lists align with the updated data requirements and surface the PNC ID alongside the existing ASN.

## 2. Background
The Magistrates Standard List is a criminal list published through CaTH. Each defendant entry currently displays an ASN (Arrest Summons Number). The data team now requires the **PNC ID** (Police National Computer identifier) to be captured in the publication and displayed to users.

PNC ID is a **non-mandatory** field. It follows the **same business rules as the ASN field**: it is optional in the source JSON, only rendered when present, and treated as free-text reference data. The supplied mock-up places PNC ID directly **under the ASN field** in the rendered list and style guide.

Three artefacts derive from the same published JSON and must all reflect the new field:
1. The **JSON validation schema** that validates the publisher's upload.
2. The **style guide / front-end display** (the rendered HTML list).
3. The **downloadable files** — PDF and CSV.

Relevant existing patterns in the codebase:
- List-type modules live under `libs/list-types/<list-type>/` with `schemas/<list-type>.json`, locale files `<list-type>/en.ts` and `<list-type>/cy.ts`, and `pdf/pdf-template.njk`.
- List-type metadata is registered in `libs/location/src/list-type-data.ts`.
- The front-end page template lives under `apps/web/src/pages/(list-types)/<list-type>/<list-type>.njk` and renders defendant rows using the `govukSummaryList` macro (see `sjp-press-list.njk` for the row-per-field pattern).

> **Important — current state of the codebase:** At the time of writing, this repository contains only a `MAGISTRATES_PUBLIC_LIST` entry (`libs/location/src/list-type-data.ts:48`) and **no dedicated Magistrates Standard List module**, and the **ASN field does not yet exist** in any schema, template, locale file, or download generator here. ASN appears only as an entry in `templates/tech-spec-references/welsh-translations-catalogue.json`. This strongly suggests the Magistrates Standard List has not yet been migrated into `cath-service`. The implementation location must be confirmed before work starts — see Section 14.

## 3. Acceptance Criteria

* **Scenario:** PNC ID accepted in the validation schema
    * **Given** a Magistrates Standard List JSON payload that includes a `pncId` value on a case
    * **When** the payload is validated against the Magistrates Standard List schema
    * **Then** validation passes and the `pncId` value is retained for rendering and download

* **Scenario:** PNC ID is optional
    * **Given** a Magistrates Standard List JSON payload with no `pncId` present on a case
    * **When** the payload is validated and rendered
    * **Then** validation passes (PNC ID is not mandatory) and no PNC ID row/value is shown for that case

* **Scenario:** PNC ID displayed under ASN in the style guide / front end
    * **Given** a published Magistrates Standard List containing a case with both an ASN and a PNC ID
    * **When** a user views the rendered list
    * **Then** the PNC ID is displayed directly beneath the ASN, using the label "PNC ID"

* **Scenario:** PNC ID present in the PDF download
    * **Given** a published Magistrates Standard List containing PNC ID values
    * **When** the PDF is generated/downloaded
    * **Then** the PDF includes the PNC ID for each case that has one, positioned consistently with the ASN

* **Scenario:** PNC ID present in the CSV download
    * **Given** a published Magistrates Standard List containing PNC ID values
    * **When** the CSV is generated/downloaded
    * **Then** the CSV contains a `PNC ID` column adjacent to the ASN column, populated where present and blank where absent

* **Scenario:** Welsh language support
    * **Given** a user viewing the Magistrates Standard List with `?lng=cy`
    * **When** a PNC ID is displayed
    * **Then** the field label is rendered in Welsh

## 14. Assumptions & Open Questions

* **Where does this work live?** The Magistrates Standard List module and the ASN field do **not currently exist** in this repository (only `MAGISTRATES_PUBLIC_LIST` metadata is registered, and ASN appears only in the Welsh translation catalogue). Confirm whether: (a) this ticket targets a list-type module that is yet to be migrated into `cath-service`, (b) the work should be done in the upstream/legacy PIP service, or (c) the Magistrates Standard List module must first be created here.
* **Exact location of ASN in the schema.** PNC ID must be a sibling of ASN. The precise object level (case vs. party/individual vs. hearing) must be read from the actual Magistrates Standard List schema once its location is confirmed.
* **PNC ID format.** Is there a canonical PNC ID format that should be enforced via a stricter `pattern` (e.g. `YYYY/NNNNNNNA`), or is it free text like ASN?
* **CSV column position and exact header text.** Assumed: column placed adjacent to ASN with header `PNC ID`.
* **Welsh translation of "PNC ID".** Assumed the acronym is retained untranslated (as with "ASN"); confirm with the Welsh translation team.
* **Field name in JSON.** Assumed the JSON property is `pncId` (camelCase). Confirm the exact key the publisher will send.

### Comment by OgechiOkelu on 2026-06-19T15:47:54Z
@plan
