# pip-* source reference (fetched) — #791 IAC Daily List

Fetched from the public HMCTS pip repos. These are the structural source of truth
for the CaTH port. Field names, required arrays, columns and locale strings below
are authoritative — do NOT invent field names beyond these.

## Key structural notes

- The JSON root is an **object** (`{ document, venue, courtLists }`), **not** an array.
  The validator fixture must be an object, and the schema root is `"type": "object"`.
- Required arrays at each level:
  - root: `document`, `venue`, `courtLists`
  - `document`: `publicationDate`
  - `venue`: `venueName`
  - `courtLists[]`: `courtListName`, `courtHouse`
  - `courtHouse`: `courtRoom`
  - `courtRoom[]`: `courtRoomName`, `session`
  - `session[]`: `sittings`, `sessionChannel`
  - `sittings[]`: `sittingStart`, `sittingEnd`, `hearing`
  - `hearing[]`: `case`
  - `case[]`: `caseNumber`
- Derived/manipulated fields used by the template but NOT in the schema (produced by
  the pip manipulation service / party-role helper):
  - `session.formattedJudiciary` (from `findAndManipulateJudiciaryForCrime`)
  - `sitting.sittingStartFormatted` (formatDate `h:mma`)
  - `sitting.caseHearingChannel` (from `findAndConcatenateHearingPlatform(sitting, session)` — session `sessionChannel` / sitting `channel`)
  - `case.appellant`, `case.appellantRepresentative`, `case.prosecutingAuthority`
    (from `findAndManipulatePartyInformation(hearingCase)` operating on the `party[]` array —
    party roles map to appellant vs prosecuting authority; representative from a rep role)
  - `case.formattedLinkedCases` (linked-cases string; may be absent)
  The CaTH renderer must reproduce these derivations from the raw schema fields
  (`party[]`, `caseSequenceIndicator`, `sessionChannel`, `channel`, `judiciary[]`).
  Look at how existing CaTH list-type renderers derive party/judiciary/channel
  (e.g. the crown/care-standards renderers and any shared party-role helper in
  `@hmcts/list-types-common`) and reuse those helpers rather than re-implementing.

## Table columns (in order) — from iac-daily-list.njk

1. Start Time  (`sitting.sittingStartFormatted`)
2. Case Ref    (`case.caseNumber` + appended `caseSequenceIndicator`)
3. Appellant/Applicant  (`case.appellant`, plus `Rep: <appellantRepresentative>` or `Rep: No Representative`)
4. Respondent  (`case.prosecutingAuthority`)
5. Interpreter Language  (`case.language`)
6. Hearing Channel  (`sitting.caseHearingChannel`)
7. Hearing Type  (`hearing.hearingType`)

## Grouping / headings

- Group by `courtList.courtListName` (h1 "site-address"), then an accordion section
  per `session`.
- Section heading logic:
  - If `courtListName` (lowercased) == "bail list":
    - if judiciary present: `{courtRoomName}, Before {formattedJudiciary}`
    - else: `{courtRoomName}`
  - else: `Hearing Room: {courtRoomName}`
- Page heading (h2): `{heading}` <br/> `{venueName} {dailyList}`.
- "List for {contentDate}", "Last updated {publishedDate} at {publishedTime}".
- Important information = GOV.UK Details (open) with P1/P2/P3.
- Footer: `Data Source: {provenance}` + back-to-top.

> Note: pip uses `heading` = "First-tier Tribunal: Immigration and Asylum Chamber"
> and `dailyList` = "Daily List". For the **Additional Cases** list type, the page
> title differs ("… Daily List - Additional Cases"); confirm whether the body heading
> also changes or only the page `<title>`/friendly name.

## English locale (en/iac-daily-list.json)

```json
{
    "title": "Immigration and Asylum Chamber Daily List",
    "heading": "First-tier Tribunal: Immigration and Asylum Chamber",
    "dailyList": "Daily List",
    "listUpdated": "Last updated DATE at",
    "listDate": "List for",
    "importantInformationHeading": "Important information",
    "importantInformationP1": "Open justice is a fundamental principle in our courts and tribunals system, and will continue to be as we increase the use of audio and video technology.",
    "importantInformationP2": "Parties and representatives will be informed as to the arrangements for hearing cases. Any other person interested in joining the hearing should contact contactia@justice.gov.uk or call 03001231711.",
    "importantInformationP3": "When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.",
    "dataSource": "Data Source",
    "backButton": "Back",
    "hearingRoom": "Hearing Room",
    "beforeJudge": "Before",
    "startTime": "Start Time",
    "caseRef": "Case Ref",
    "appellant": "Appellant/Applicant",
    "respondent": "Respondent",
    "interpreterLanguage": "Interpreter Language",
    "hearingChannel": "Hearing Channel",
    "hearingType": "Hearing Type",
    "rep": "Rep",
    "noRep": "No Representative"
}
```

## Welsh locale (cy/iac-daily-list.json)

```json
{
    "title": "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
    "heading": "Tribiwnlys Haen Gyntaf: Siambr Mewnfudo a Lloches",
    "dailyList": "Rhestr Ddyddiol",
    "listUpdated": "Diweddarwyd ddiwethaf DATE am ",
    "listDate": "Rhestr ar gyfer",
    "importantInformationHeading": "Gwybodaeth Bwysig",
    "importantInformationP1": "Mae cyfiawnder agored yn egwyddor hanfodol yn system y llysoedd a’r tribiwnlysoedd, a bydd hyn yn parhau wrth i ni ddefnyddio mwy ar dechnoleg sain a fideo.",
    "importantInformationP2": "Bydd partïon a chynrychiolwyr yn cael gwybod ynghylch y trefniadau ar gyfer gwrando achosion. Dylai unrhyw berson arall sydd â diddordeb mewn ymuno â’r gwrandawiad gysylltu â contactia@justice.gov.uk neu ffonio 03001231711.",
    "importantInformationP3": "Wrth ystyried a ddylid defnyddio technoleg ffôn a fideo, bydd y farnwriaeth yn ystyried yr egwyddor cyfiawnder agored. Efallai y bydd barnwyr yn penderfynu y dylid cynnal gwrandawiad yn breifat os yw hyn yn angenrheidiol i sicrhau y gweinyddir cyfiawnder yn briodol.",
    "dataSource": "Fynhonnell Data",
    "backButton": "Yn ôl",
    "hearingRoom": "Ystafell Wrandawiadau",
    "beforeJudge": "Gerbron",
    "startTime": "Amser Cychwyn",
    "caseRef": "Cyfeirnod yr Achos",
    "appellant": "Apelydd/Ymgeisydd",
    "respondent": "Atebydd",
    "interpreterLanguage": "Iaith y Cyfieithydd",
    "hearingChannel": "Sianel y Gwrandawiad",
    "hearingType": "Math o Clyw",
    "rep": "Cynrychiolydd",
    "noRep": "Dim Cynrychiolydd"
}
```

## Email summary (IacDailyListSummaryData.java)

Grouped by `courtListName`; per hearing case emits three fields:
- "Appellant/Applicant" ← `claimant` (derived by party-role helper)
- "Prosecuting authority" ← `prosecutingAuthority` (derived)
- "Case reference" ← `caseNumber`

## JSON schema

The full schema is committed to the lib at `src/schemas/iac-daily-list.json`
during implementation. Root is `"type": "object"`, `$defs.judiciary` defines the
judiciary object. See the required-array list at the top of this file.
