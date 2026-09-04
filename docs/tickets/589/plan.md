# Plan: Payload limits for publication file & summary generation (#589)

## Context

Set payload limits for generating publication outputs, mirroring legacy CaTH ORG.
Investigation of the reference repos (`pip-data-management` and `pip-publication-services`)
confirmed the three "limits" are all thresholds on the **source JSON payload size**,
checked *before* generation — not limits on the generated output file, and not a rejection
of the upload.

**Behaviour when a limit is exceeded (verified in legacy, identical pattern for all three):**
the output is simply **not generated** and the publication still succeeds — the list is
published and viewable online, it just lacks that one output.
- PDF / Excel: `PublicationFileGenerationService.generate` returns an empty byte array
  (`new byte[0]`); nothing saved.
- Summary: `SubscriptionNotificationService.getArtefactSummary` returns `""`.

Current state in this repo (`libs/publication/src/processing/service.ts` `processPublication`,
~lines 588-691): PDF, Excel, and the email "summary of cases" are all generated
**unconditionally** — no source-size guards. Upload size *is* measured at ingest
(`apps/api/src/routes/v1/publication.ts:71-74`) and validated against a 100MB cap
(`libs/api/src/blob-ingestion/validation.ts:14`), then discarded — it is **not** persisted
on the `Artefact` model (`libs/postgres-prisma/prisma/schema/base.prisma:11-33`).

Separately, an *output*-size gate already exists and is a DIFFERENT axis that stays as-is:
`MAX_PDF_SIZE_BYTES = 2MB` (`libs/notifications/src/notification/notification-service.ts:477-480`)
drops the PDF/Excel GOV.Notify **link** when the *generated* file exceeds ~2MB (files are
delivered as `prepareUpload` links, never attachments). Note the numeric coincidence with the
new PDF source gate below — they do different jobs.

## Latest CaTH ORG figures (verified — not overridden in either service's Helm values)

| Output        | Legacy source-gate | Source of truth (`application.yaml`)                |
|---------------|--------------------|-----------------------------------------------------|
| PDF           | 256 KB             | `pip-data-management` `max-size-pdf: 256`           |
| Excel         | 10 MB (10240 KB)   | `pip-data-management` `max-size-excel: 10240`       |
| Email summary | 256 KB             | `pip-publication-services` `max-size-summary: 256`  |

(The `pip-data-management` README says Excel default "4096kb" but the deployed
`application.yaml` value is 10240kb = 10MB — trust the code, not the README. Legacy makes
these env-overridable via `${PDF_MAX_INBOUND_SIZE:...}` etc., but no environment's Helm
values actually override them — all run on the code defaults.)

## Limits to enforce (source-JSON gates, before generation) — hardcoded, no env vars

| Output        | Gate default | Decision                                                        |
|---------------|--------------|-----------------------------------------------------------------|
| PDF           | **2 MB**     | Raised from legacy 256KB — Puppeteer/Chromium handles larger source better than legacy openhtmltopdf. **Empirically verified** (see below). |
| Excel         | **10 MB**    | Matches legacy exactly.                                          |
| Email summary | **256 KB**   | Matches legacy exactly.                                          |

Constants expressed in **bytes**: PDF `2 * 1024 * 1024`, Excel `10 * 1024 * 1024`,
summary `256 * 1024`. Per decision: **no configurable env variables for now** — plain
`SCREAMING_SNAKE_CASE` constants (legacy has env overrides but never uses them; YAGNI).

**PDF 2MB verification (benchmark on the real SJP render + Puppeteer path):** a 2 MB source
(~5,000 cases) renders in ~2.2 s using ~390 MB RSS; 3 MB still succeeds in ~2.6 s. Puppeteer
is comfortably within capacity at 2 MB — the deviation from legacy's 256 KB is safe.

Note on source-vs-output size: a 2 MB source produces a ~6.9 MB PDF, and output PDFs cross
the 2 MB GOV.Notify email-link cap (`MAX_PDF_SIZE_BYTES`) at only ~600 KB of source. This is
**not new or incorrect** — legacy behaves identically (`RawDataSubscriptionEmailGeneratorV2`
has its own `MAX_FILE_SIZE = 2_000_000` and simply drops the PDF link when the generated file
exceeds it, sending a no-link email; the PDF stays viewable on the web). The source gate and
the output-link gate are independent in both legacy and this codebase.

## Technical approach

- Measure source size **inline** at generation time via
  `Buffer.byteLength(JSON.stringify(jsonData), "utf8")`. No schema change / migration.
  Rationale for on-the-fly over a stored column: generation happens in the same process
  that already holds `jsonData` (both gate points already have it in memory), so the size
  computation is free — no extra fetch/query. Legacy persists `payloadSize` only because
  its generation runs in a *separate service* (`pip-publication-services`) that lacks the
  raw JSON and must read the size across a service boundary — a constraint we don't have.
  A stored column here would add a migration + dual-path population for zero functional gain
  (YAGNI). Note: `JSON.stringify` may differ by a few bytes from the raw uploaded body
  (whitespace/key order), which is immaterial for a threshold gate — legacy's stored value
  is itself a derived `Float`, not an exact byte count.
- Gate each output **independently** — skipping one must not skip the others (legacy does
  the same: independent `payloadWithin*` checks).
- On exceed: skip generation, leave the corresponding result path unset, `log()` a clear
  line, and let the publication proceed. No error, no thrown exception, no upload rejection.

## Implementation details

**TEMPLATE SOURCE: n/a** — payload/size-limit validation work, no new rendered page or list-type view.

1. **Size-limit constants colocated with each consumer** (mirrors legacy — PDF/Excel gates
   live in `pip-data-management`, the summary gate in `pip-publication-services`; each limit
   sits with the service that generates the output it guards). No constant is shared across
   packages, so a shared module would add coupling for no DRY benefit and — because
   `publication` already imports `@hmcts/notifications` — putting the summary constant in
   `publication` would create a `publication`↔`notifications` cycle. Colocation avoids both.
   - `libs/publication/src/processing/payload-limits.ts`: `MAX_PDF_PAYLOAD_BYTES`,
     `MAX_EXCEL_PAYLOAD_BYTES`, and `payloadSizeBytes(jsonData)` (UTF-8 byte length).
   - `libs/notifications/src/notification/payload-limits.ts`: `MAX_SUMMARY_PAYLOAD_BYTES`
     and `payloadSizeBytes(jsonData)`.
   - Size is computed ONCE per publication and compared with `<` against each limit (no
     repeated re-serialisation). Co-located `payload-limits.test.ts` in each lib.

2. **PDF + Excel gates** — `libs/publication/src/processing/service.ts` (`processPublication`, ~lines 610-649)
   - Before `generatePublicationPdf(...)`: skip when source ≥ `MAX_PDF_PAYLOAD_BYTES`;
     leave `result.pdfPath` unset.
   - Before `generatePublicationExcel(...)`: skip when source ≥ `MAX_EXCEL_PAYLOAD_BYTES`;
     leave `result.excelPath` unset.
   - `log()` a "skipped generation: source payload N bytes exceeds limit" line per skip.

3. **Email summary gate** — `libs/notifications/src/notification/notification-service.ts`
     (`buildEmailTemplateData` / `buildEnhancedEmailData`, ~lines 428-463)
   - When `event.jsonData` byte size ≥ `MAX_SUMMARY_PAYLOAD_BYTES`, take the
     `buildFallbackEmailData` path (`display_summary: "no"`, empty `summary_of_cases`)
     instead of extracting the enhanced summary — mirrors legacy returning `""`.
   - Import the constant/helper from `@hmcts/publication` to keep one source of truth.

## Error handling & edge cases

- Source exactly at limit: strict `<` (matches legacy `payloadWithin*` semantics — equal is over).
- Empty / missing `jsonData` (flat-file lists): no generation path triggered — gates are no-ops.
- Oversized Excel source but valid PDF source: PDF still generated, Excel skipped (independent gates).
- A generated file under its source gate but over the 2MB *output* gate: existing
  link-drop behaviour applies (summary-only email) — unchanged, no new work.

## Acceptance criteria mapping

- "PDF generation" → PDF source gate (2MB) in `service.ts`; unit test: under → generated, over → skipped.
- "Excel generation - 10MB" → Excel source gate in `service.ts`; unit test: under → generated, over → skipped.
- "Email summary generation - 256KB" → summary gate in `notification-service.ts`; unit test:
  under → enhanced summary, over → fallback/no-summary template.
- "Check latest figures from CaTH ORG" → Excel 10MB and summary 256KB match verified legacy
  defaults; PDF raised to 2MB for Puppeteer, empirically benchmarked (~2.2s at 2MB source) and
  cross-checked against legacy's identical independent output-link gate.

## Verification

- `yarn test` for new/updated unit tests in `libs/publication` and `libs/notifications`.
- Tests assert: just-under-limit → output generated; at/over-limit → that output skipped while
  the other outputs still generate; summary falls back to the no-summary template when ≥256KB;
  publication result still succeeds when an output is skipped.
