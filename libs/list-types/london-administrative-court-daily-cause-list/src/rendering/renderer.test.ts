import { describe, expect, it } from "vitest";
import type { LondonAdminCourtData } from "../models/types.js";
import { renderLondonAdminCourt } from "./renderer.js";

describe("renderLondonAdminCourt", () => {
  const baseOptions = {
    locale: "en",
    displayFrom: new Date(2025, 0, 15),
    displayTo: new Date(2025, 0, 15),
    lastReceivedDate: "2025-01-14T09:30:00Z"
  };

  it("should render header with English title", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.header.listTitle).toBe("London Administrative Court Daily Cause List");
    expect(result.header.listDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedDate).toContain("14 January 2025");
    expect(result.header.lastUpdatedTime).toBeDefined();
  });

  it("should render header with Welsh title when locale is cy", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, { ...baseOptions, locale: "cy" });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Llundain");
  });

  it("should render main hearings correctly", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10.30am",
          caseNumber: "CO/2025/000123",
          caseDetails: "R (Claimant) v Secretary of State",
          hearingType: "Judicial review",
          additionalInformation: "Listed for 1 day"
        }
      ],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings).toHaveLength(1);
    expect(result.mainHearings[0].venue).toBe("Court 1");
    expect(result.mainHearings[0].judge).toBe("Mr Justice Smith");
    expect(result.mainHearings[0].time).toBe("10:30am");
    expect(result.mainHearings[0].caseNumber).toBe("CO/2025/000123");
    expect(result.mainHearings[0].caseDetails).toBe("R (Claimant) v Secretary of State");
    expect(result.mainHearings[0].hearingType).toBe("Judicial review");
    expect(result.mainHearings[0].additionalInformation).toBe("Listed for 1 day");
  });

  it("should render planning court hearings correctly", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: [
        {
          venue: "Court 5",
          judge: "Mrs Justice Jones",
          time: "2.15pm",
          caseNumber: "CO/2025/000456",
          caseDetails: "Planning appeal matter",
          hearingType: "Planning appeal",
          additionalInformation: ""
        }
      ]
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.planningCourt).toHaveLength(1);
    expect(result.planningCourt[0].venue).toBe("Court 5");
    expect(result.planningCourt[0].time).toBe("2:15pm");
  });

  it("should normalize time format by replacing dots with colons", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "2.15pm",
          caseNumber: "CO/2025/000123",
          caseDetails: "Test case",
          hearingType: "Hearing",
          additionalInformation: ""
        }
      ],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings[0].time).toBe("2:15pm");
  });

  it("should handle time without minutes", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "9am",
          caseNumber: "CO/2025/000123",
          caseDetails: "Test case",
          hearingType: "Hearing",
          additionalInformation: ""
        }
      ],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings[0].time).toBe("9am");
  });

  it("should handle empty additionalInformation", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10am",
          caseNumber: "CO/2025/000123",
          caseDetails: "Test case",
          hearingType: "Hearing",
          additionalInformation: ""
        }
      ],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings[0].additionalInformation).toBe("");
  });

  it("should render multiple hearings in both sections", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Mr Justice Smith",
          time: "10am",
          caseNumber: "CO/2025/000123",
          caseDetails: "Case 1",
          hearingType: "Hearing",
          additionalInformation: ""
        },
        {
          venue: "Court 2",
          judge: "Mrs Justice Jones",
          time: "2pm",
          caseNumber: "CO/2025/000456",
          caseDetails: "Case 2",
          hearingType: "Review",
          additionalInformation: ""
        }
      ],
      planningCourt: [
        {
          venue: "Court 5",
          judge: "Mr Justice Brown",
          time: "11am",
          caseNumber: "CO/2025/000789",
          caseDetails: "Planning case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ]
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings).toHaveLength(2);
    expect(result.planningCourt).toHaveLength(1);
    expect(result.mainHearings[0].caseNumber).toBe("CO/2025/000123");
    expect(result.mainHearings[1].caseNumber).toBe("CO/2025/000456");
    expect(result.planningCourt[0].caseNumber).toBe("CO/2025/000789");
  });

  it("should format lastUpdated with time correctly", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T09:30:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/9:30am/);
  });

  it("should format PM times correctly in lastUpdated", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T14:45:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/2:45pm/);
  });

  it("should format times on the hour without minutes in lastUpdated", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, {
      ...baseOptions,
      lastReceivedDate: "2025-01-14T10:00:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/10am/);
  });

  it("should handle empty data", () => {
    const data: LondonAdminCourtData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = renderLondonAdminCourt(data, baseOptions);

    expect(result.mainHearings).toHaveLength(0);
    expect(result.planningCourt).toHaveLength(0);
    expect(result.header.listTitle).toBe("London Administrative Court Daily Cause List");
  });
});
