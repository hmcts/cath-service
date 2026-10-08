import { type CaseSummary, SPECIAL_CATEGORY_DATA_WARNING } from "@hmcts/list-types-common";
import type { BusinessAndPropertyRollsData, ChdKbHearing } from "../models/types.js";
import { SECTIONS } from "../sections.js";

export { SPECIAL_CATEGORY_DATA_WARNING };

// Shown for a section that has no hearings, mirroring the on-screen "no hearings" message.
const NO_HEARINGS_MESSAGE = "No hearings scheduled for this day.";

// Single-field blocks carry a sentinel label so the bespoke formatter can tell a bold section
// heading apart from the (non-bold) "no hearings" note. These labels are never rendered.
const SECTION_LABEL = "__section__";
const NOTE_LABEL = "__note__";

function mapHearingToSummary(hearing: ChdKbHearing): CaseSummary {
  return [
    { label: "Time", value: hearing.time || "" },
    { label: "Case number", value: hearing.caseNumber || "" },
    { label: "Case name", value: hearing.caseName || "" }
  ];
}

// This is a multi-section list, so the email summary keeps section boundaries: each section emits a
// heading block, followed either by a block per hearing or a single "no hearings" block when empty.
export function extractCaseSummary(jsonData: BusinessAndPropertyRollsData): CaseSummary[] {
  const summaries: CaseSummary[] = [];

  for (const section of SECTIONS) {
    // Email headings use the "&" form (e.g. "IP & Enterprise Court"); worksheetName carries it. The
    // web page and PDF use the "and" display form (section.en) instead.
    summaries.push([{ label: SECTION_LABEL, value: section.worksheetName }]);

    const hearings = jsonData[section.key] ?? [];
    if (hearings.length === 0) {
      summaries.push([{ label: NOTE_LABEL, value: NO_HEARINGS_MESSAGE }]);
    } else {
      for (const hearing of hearings) {
        summaries.push(mapHearingToSummary(hearing));
      }
    }
  }

  return summaries;
}

// Bespoke layout for this multi-section list (the shared formatCaseSummaryForEmail renders a flat
// "---" separated list with no headings). Section names use GOV.UK Notify's "#" heading syntax —
// Notify email does NOT support "**bold**" (it renders the asterisks literally). "##" renders as a
// (smaller) heading and "---" as a horizontal rule. Within a section, the heading, each hearing and
// the "no hearings" note are separated by a blank line; a "---" rule sits between sections. The last
// section has no trailing rule — Notify already renders one at the end of the summary block, e.g.
//
//   ## Appeal List
//
//   Time - 10:30am
//   Case number - 1234
//   Case name - This is case name
//
//   Time - 11:30am
//   Case number - 5678
//   Case name - This is case name 2
//
//   ---
//
//   ## IP & Enterprise Court
//
//   No hearings scheduled for this day.
export function formatCaseSummaryForEmail(items: CaseSummary[]): string {
  if (items.length === 0) {
    return "No cases scheduled.";
  }

  const sections: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      sections.push(current.join("\n\n"));
      current = [];
    }
  };

  for (const block of items) {
    if (block[0]?.label === SECTION_LABEL) {
      flush();
      current.push(`## ${block[0].value}`);
    } else if (block[0]?.label === NOTE_LABEL) {
      current.push(block[0].value);
    } else {
      current.push(block.map((field) => `${field.label} - ${field.value}`).join("\n"));
    }
  }
  flush();

  // A "---" rule between sections, but none after the last (Notify appends one by default).
  return sections.join("\n\n---\n\n");
}
