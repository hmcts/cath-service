import { describe, expect, it } from "vitest";
import { validateCrownFirmList } from "./json-validator.js";

const VALID_DATA = {
  FirmList: {
    DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
    ListHeader: { StartDate: "2025-01-01", PublishedTime: "2025-01-01T09:00:00Z", Version: "1.0" },
    CrownCourt: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Manchester" },
    CourtLists: [
      {
        SittingDate: "2025-01-01",
        CourtHouse: { CourtHouseType: "Crown Court", CourtHouseCode: 1001, CourtHouseName: "Crown Court at Manchester" },
        Sittings: [
          {
            CourtRoomNumber: 1,
            Judiciary: { Judge: { CitizenNameSurname: "Brown" } },
            Hearings: [
              {
                HearingSequenceNumber: 1,
                HearingDetails: { HearingDescription: "Trial" },
                CaseNumber: "T12345678",
                CaseNumberCaTH: "C12345678",
                Prosecution: {
                  Advocate: {
                    PersonalDetails: {
                      Name: { CitizenNameSurname: "Jones" },
                      IsMasked: "no"
                    }
                  },
                  ProsecutingOrganisation: { OrganisationName: "Crown Prosecution Service" }
                },
                CommittingCourt: {
                  CourtHouseType: "Magistrates Court",
                  CourtHouseCode: 2001,
                  CourtHouseName: "Manchester Magistrates Court"
                },
                Defendants: [
                  {
                    PersonalDetails: { Name: { CitizenNameSurname: "Doe" }, IsMasked: "no" },
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

describe("validateCrownFirmList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCrownFirmList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when FirmList is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.DocumentID;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.UniqueID is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.DocumentID.UniqueID;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when DocumentID.DocumentType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.DocumentID.DocumentType;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.ListHeader;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.StartDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.ListHeader.StartDate;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.Version is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.ListHeader.Version;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when ListHeader.PublishedTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.ListHeader.PublishedTime;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CrownCourt;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CrownCourt.CourtHouseType;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CrownCourt.CourtHouseCode;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CrownCourt.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CrownCourt.CourtHouseName;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].SittingDate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].SittingDate;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].CourtHouse;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].CourtHouse.CourtHouseType;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].CourtHouse.CourtHouseCode;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].CourtHouse.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].CourtHouse.CourtHouseName;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CourtLists[0].Sittings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].CourtRoomNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].CourtRoomNumber;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Judiciary;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary.Judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Judiciary.Judge;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Sittings[0].Judiciary.Judge.CitizenNameSurname is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Judiciary.Judge.CitizenNameSurname;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingSequenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].HearingSequenceNumber;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].HearingDetails;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].HearingDetails.HearingDescription is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].HearingDetails.HearingDescription;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].CaseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].CaseNumber;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Hearings[0].CaseNumberCaTH is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].CaseNumberCaTH;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails.Name;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.Advocate.PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.Advocate.PersonalDetails.IsMasked;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Prosecution.ProsecutingOrganisation.OrganisationName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Prosecution.ProsecutingOrganisation.OrganisationName;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseType;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseCode is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseCode;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when CommittingCourt.CourtHouseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].CommittingCourt.CourtHouseName;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails.Name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails.Name;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].PersonalDetails.IsMasked is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].PersonalDetails.IsMasked;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when Defendants[0].Charges[0].OffenceStatement is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.FirmList.CourtLists[0].Sittings[0].Hearings[0].Defendants[0].Charges[0].OffenceStatement;
    const result = validateCrownFirmList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
