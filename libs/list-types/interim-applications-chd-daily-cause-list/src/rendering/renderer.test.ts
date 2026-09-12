import { describe, expect, it } from "vitest";
import type { InterimApplicationsChdData } from "../models/types.js";
import { renderInterimApplicationsChdDailyCauseList } from "./renderer.js";

function buildData(overrides: Partial<InterimApplicationsChdData> = {}): InterimApplicationsChdData {
  return {
    hearingList: [
      {
        judge: "Judge A",
        time: "10.30am",
        venue: "Venue A",
        type: "Type A",
        caseNumber: "1234",
        caseName: "Case name A",
        additionalInformation: "This is additional information"
      }
    ],
    openJusticeStatementDetails: [{ nameToBeDisplayed: "Judge OpenJusticeTest", email: "Judge.OpenJusticeTest@justice.gov.uk" }],
    ...overrides
  };
}

const OPTIONS = {
  locale: "en",
  contentDate: new Date("2025-06-20"),
  lastReceivedDate: "2025-01-01T09:55:00Z"
};

describe("renderInterimApplicationsChdDailyCauseList", () => {
  it("should render header and hearings from the hearingList", () => {
    const result = renderInterimApplicationsChdDailyCauseList(buildData(), OPTIONS);

    expect(result.header.listTitle).toBe("Interim Applications List (Chancery Division) Daily Cause List");
    expect(result.header.listDate).toBe("20 June 2025");
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].caseNumber).toBe("1234");
  });

  it("should build the editable important-information paragraph from openJusticeStatementDetails[0]", () => {
    const result = renderInterimApplicationsChdDailyCauseList(buildData(), OPTIONS);

    expect(result.importantInfo.editableParagraph).toBe(
      "Parties should contact the clerk to the Interim Judge, Judge OpenJusticeTest, Judge.OpenJusticeTest@justice.gov.uk as early as possible."
    );
  });

  it("should reflect a different judge name and email per upload", () => {
    const result = renderInterimApplicationsChdDailyCauseList(
      buildData({ openJusticeStatementDetails: [{ nameToBeDisplayed: "Judge Second", email: "second@justice.gov.uk" }] }),
      OPTIONS
    );

    expect(result.importantInfo.editableParagraph).toContain("Judge Second");
    expect(result.importantInfo.editableParagraph).toContain("second@justice.gov.uk");
  });

  it("should fall back to static wording when openJusticeStatementDetails is empty", () => {
    const result = renderInterimApplicationsChdDailyCauseList(buildData({ openJusticeStatementDetails: [] }), OPTIONS);

    expect(result.importantInfo.editableParagraph).toBe("Parties should contact the clerk to the Interim Judge as early as possible.");
  });

  it("should always include the static second paragraph", () => {
    const result = renderInterimApplicationsChdDailyCauseList(buildData(), OPTIONS);

    expect(result.importantInfo.staticParagraph).toContain("Interim Applications Judge");
  });

  it("should use the Welsh list title and Welsh important-info wording when locale is cy", () => {
    const result = renderInterimApplicationsChdDailyCauseList(buildData({ openJusticeStatementDetails: [] }), { ...OPTIONS, locale: "cy" });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol Ceisiadau Interim (Adran Siawnsri)");
    expect(result.importantInfo.editableParagraph).toBe("Dylai partïon gysylltu â chlerc y Barnwr Interim cyn gynted â phosibl.");
  });
});
