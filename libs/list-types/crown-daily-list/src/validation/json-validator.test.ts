import { describe, expect, it } from "vitest";
import { validateCrownDailyList } from "./json-validator.js";

const VALID_DATA = {
  DailyList: {
    DocumentID: { UniqueID: "CDPL-2025-001", DocumentType: "crown_daily_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00Z", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Leeds" },
    CourtLists: [
      {
        CourtHouse: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Leeds" },
        Sittings: [
          {
            CourtRoomNumber: 1,
            Judiciary: { Judge: { CitizenNameSurname: "Smith" } },
            Hearings: [
              {
                HearingSequenceNumber: 1,
                HearingDetails: { HearingDescription: "Trial" },
                CaseNumber: "T12345678",
                CaseNumberCaTH: "C12345678",
                Prosecution: {
                  ProsecutingOrganisation: { OrganisationName: "Crown Prosecution Service" },
                  Advocate: {
                    PersonalDetails: {
                      Name: { CitizenNameSurname: "Jones" },
                      IsMasked: "no"
                    }
                  }
                },
                CommittingCourt: {
                  CourtHouseType: "Magistrates Court",
                  CourtHouseCode: 2001,
                  CourtHouseName: "Leeds Magistrates Court"
                },
                Defendants: [
                  {
                    PersonalDetails: { Name: { CitizenNameSurname: "Doe" }, IsMasked: "no" },
                    PrisonLocation: { Location: ["HMP Leeds"] },
                    Charges: [{ OffenceStatement: "Theft contrary to section 1 of the Theft Act 1968" }]
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

describe("validateCrownDailyList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownDailyList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when DailyList is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.DocumentID;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.UniqueID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.DocumentID.UniqueID;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.DocumentType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.DocumentID.DocumentType;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.ListHeader;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.StartDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.ListHeader.StartDate;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.Version is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.ListHeader.Version;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.PublishedTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.ListHeader.PublishedTime;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CrownCourt;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CrownCourt.CourtHouseType;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CrownCourt.CourtHouseCode;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CrownCourt.CourtHouseName;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].CourtHouse;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].CourtHouse.CourtHouseType;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].CourtHouse.CourtHouseCode;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].CourtHouse.CourtHouseName;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].Sittings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].CourtRoomNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].CourtRoomNumber;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Judiciary;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary.Judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Judiciary.Judge;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary.Judge.CitizenNameSurname is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Judiciary.Judge.CitizenNameSurname;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingSequenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].HearingSequenceNumber;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].HearingDetails;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingDetails.HearingDescription is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].HearingDetails.HearingDescription;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].CaseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].CaseNumber;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].CaseNumberCaTH is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].CaseNumberCaTH;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.ProsecutingOrganisation.OrganisationName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.ProsecutingOrganisation.OrganisationName;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails.Name;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails.IsMasked;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseType;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseCode;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseName;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails.Name;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails.IsMasked;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PrisonLocation.Location is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PrisonLocation.Location;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].Charges[0].OffenceStatement is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.DailyList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].Charges[0].OffenceStatement;
    const result = validateCrownDailyList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
