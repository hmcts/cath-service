import { describe, expect, it } from "vitest";
import { validateCrownWarnedList } from "./json-validator.js";

const VALID_DATA = {
  WarnedList: {
    DocumentID: { UniqueID: "CWPL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00Z", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Birmingham" },
    CourtLists: [
      {
        CourtHouse: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Birmingham" },
        WithFixedDate: [
          {
            Fixture: [
              {
                Cases: [
                  {
                    CaseNumber: "T12345678",
                    CaseNumberCaTH: "C12345678",
                    Defendants: [
                      {
                        PersonalDetails: { Name: { CitizenNameSurname: "Doe" }, IsMasked: "no" },
                        PrisonLocation: { Location: ["HMP Birmingham"] },
                        Charges: [{ OffenceStatement: "Theft contrary to section 1 of the Theft Act 1968" }]
                      }
                    ],
                    Hearing: [{ HearingDescription: "Trial" }],
                    LinkedCases: [{ CaseNumber: "T87654321" }]
                  }
                ]
              }
            ]
          }
        ],
        WithoutFixedDate: [
          {
            Fixture: [
              {
                Cases: [
                  {
                    CaseNumber: "T11111111",
                    CaseNumberCaTH: "C11111111",
                    Defendants: [
                      {
                        PersonalDetails: { Name: { CitizenNameSurname: "Smith" }, IsMasked: "no" }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
};

describe("validateCrownWarnedList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownWarnedList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when WarnedList is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.DocumentID;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.UniqueID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.DocumentID.UniqueID;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.DocumentType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.DocumentID.DocumentType;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.ListHeader;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.StartDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.ListHeader.StartDate;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.Version is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.ListHeader.Version;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.PublishedTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.ListHeader.PublishedTime;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CrownCourt;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CrownCourt.CourtHouseType;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CrownCourt.CourtHouseCode;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CrownCourt.CourtHouseName;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].CourtHouse;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].CourtHouse.CourtHouseType;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].CourtHouse.CourtHouseCode;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].CourtHouse.CourtHouseName;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate[0].Fixture is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate[0].Fixture[0].Cases is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Cases[0].CaseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].CaseNumber;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Cases[0].CaseNumberCaTH is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].CaseNumberCaTH;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Cases[0].Defendants is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Defendants[0].PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Defendants[0].PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails.Name;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Defendants[0].PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails.IsMasked;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Defendants[0].PrisonLocation.Location is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants[0].PrisonLocation.Location;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Defendants[0].Charges[0].OffenceStatement is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Defendants[0].Charges[0].OffenceStatement;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate Hearing[0].HearingDescription is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].Hearing[0].HearingDescription;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithFixedDate LinkedCases[0].CaseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithFixedDate[0].Fixture[0].Cases[0].LinkedCases[0].CaseNumber;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate[0].Fixture is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate[0].Fixture[0].Cases is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Cases[0].CaseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].CaseNumber;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Cases[0].CaseNumberCaTH is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].CaseNumberCaTH;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Cases[0].Defendants is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].Defendants;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Defendants[0].PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Defendants[0].PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails.Name;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when WithoutFixedDate Defendants[0].PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.WarnedList.CourtLists[0].WithoutFixedDate[0].Fixture[0].Cases[0].Defendants[0].PersonalDetails.IsMasked;
    const result = validateCrownWarnedList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
