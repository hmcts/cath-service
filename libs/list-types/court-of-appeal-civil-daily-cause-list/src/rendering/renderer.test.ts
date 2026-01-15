import { describe, expect, it } from "vitest";
import type { CourtOfAppealCivilData } from "../models/types.js";
import { renderCourtOfAppealCivil } from "./renderer.js";

describe("renderCourtOfAppealCivil", () => {
  const baseOptions = {
    locale: "en",
    displayFrom: new Date(2025, 0, 15),
    displayTo: new Date(2025, 0, 15),
    lastReceivedDate: "2025-01-14T09:30:00Z"
  };

  it("should render header with English title", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.header.listTitle).toBe("Court of Appeal (Civil Division) Daily Cause List");
    expect(result.header.listDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedDate).toContain("14 January 2025");
    expect(result.header.lastUpdatedTime).toBeDefined();
  });

  it("should render header with Welsh title when locale is cy", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, { ...baseOptions, locale: "cy" });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)");
  });

  it("should render daily hearings correctly", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10.30am",
          caseNumber: "CA-2025-000123",
          caseDetails: "Appellant v Respondent",
          hearingType: "Appeal hearing",
          additionalInformation: "Reserved judgment"
        }
      ],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings).toHaveLength(1);
    expect(result.dailyHearings[0].venue).toBe("Court 71");
    expect(result.dailyHearings[0].judge).toBe("Lord Justice Smith");
    expect(result.dailyHearings[0].time).toBe("10:30am");
    expect(result.dailyHearings[0].caseNumber).toBe("CA-2025-000123");
    expect(result.dailyHearings[0].caseDetails).toBe("Appellant v Respondent");
    expect(result.dailyHearings[0].hearingType).toBe("Appeal hearing");
    expect(result.dailyHearings[0].additionalInformation).toBe("Reserved judgment");
  });

  it("should normalize time format by replacing dots with colons", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "2.15pm",
          caseNumber: "CA-2025-000123",
          caseDetails: "Test case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings[0].time).toBe("2:15pm");
  });

  it("should handle time without minutes", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "9am",
          caseNumber: "CA-2025-000123",
          caseDetails: "Test case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings[0].time).toBe("9am");
  });

  it("should handle empty additionalInformation", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10am",
          caseNumber: "CA-2025-000123",
          caseDetails: "Test case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings[0].additionalInformation).toBe("");
  });

  it("should render multiple daily hearings", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10am",
          caseNumber: "CA-2025-000123",
          caseDetails: "Case 1",
          hearingType: "Appeal",
          additionalInformation: ""
        },
        {
          venue: "Court 72",
          judge: "Lady Justice Jones",
          time: "2pm",
          caseNumber: "CA-2025-000456",
          caseDetails: "Case 2",
          hearingType: "Permission hearing",
          additionalInformation: "Video link"
        }
      ],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings).toHaveLength(2);
    expect(result.dailyHearings[0].caseNumber).toBe("CA-2025-000123");
    expect(result.dailyHearings[1].caseNumber).toBe("CA-2025-000456");
  });

  it("should render future judgments with formatted date", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: [
        {
          date: "20/01/2025",
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10.30am",
          caseNumber: "CA-2025-000789",
          caseDetails: "Test judgment case",
          hearingType: "Judgment",
          additionalInformation: "Reserved"
        }
      ]
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.futureJudgments).toHaveLength(1);
    expect(result.futureJudgments[0].date).toBe("20 January 2025");
    expect(result.futureJudgments[0].venue).toBe("Court 71");
    expect(result.futureJudgments[0].judge).toBe("Lord Justice Smith");
    expect(result.futureJudgments[0].time).toBe("10:30am");
    expect(result.futureJudgments[0].caseNumber).toBe("CA-2025-000789");
  });

  it("should format future judgment date in Welsh when locale is cy", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: [
        {
          date: "01/02/2025",
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10am",
          caseNumber: "CA-2025-000789",
          caseDetails: "Test case",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = renderCourtOfAppealCivil(data, { ...baseOptions, locale: "cy" });

    expect(result.futureJudgments[0].date).toContain("Chwefror");
  });

  it("should render multiple future judgments", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: [
        {
          date: "20/01/2025",
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10am",
          caseNumber: "CA-2025-000789",
          caseDetails: "Case 1",
          hearingType: "Judgment",
          additionalInformation: ""
        },
        {
          date: "25/01/2025",
          venue: "Court 72",
          judge: "Lady Justice Jones",
          time: "2pm",
          caseNumber: "CA-2025-000999",
          caseDetails: "Case 2",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.futureJudgments).toHaveLength(2);
    expect(result.futureJudgments[0].date).toBe("20 January 2025");
    expect(result.futureJudgments[1].date).toBe("25 January 2025");
  });

  it("should format lastUpdated with time correctly", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T09:30:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/9:30am/);
  });

  it("should format PM times correctly in lastUpdated", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T14:45:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/2:45pm/);
  });

  it("should format times on the hour without minutes in lastUpdated", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T10:00:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/10am/);
  });

  it("should handle both daily hearings and future judgments together", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Smith",
          time: "10am",
          caseNumber: "CA-2025-000123",
          caseDetails: "Daily hearing case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: [
        {
          date: "20/01/2025",
          venue: "Court 72",
          judge: "Lady Justice Jones",
          time: "2pm",
          caseNumber: "CA-2025-000789",
          caseDetails: "Future judgment case",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings).toHaveLength(1);
    expect(result.futureJudgments).toHaveLength(1);
    expect(result.dailyHearings[0].caseDetails).toBe("Daily hearing case");
    expect(result.futureJudgments[0].caseDetails).toBe("Future judgment case");
  });

  it("should handle empty data", () => {
    const data: CourtOfAppealCivilData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = renderCourtOfAppealCivil(data, baseOptions);

    expect(result.dailyHearings).toHaveLength(0);
    expect(result.futureJudgments).toHaveLength(0);
    expect(result.header.listTitle).toBe("Court of Appeal (Civil Division) Daily Cause List");
  });
});
