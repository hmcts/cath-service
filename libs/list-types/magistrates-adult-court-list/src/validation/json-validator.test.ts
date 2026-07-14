import { describe, expect, it } from "vitest";
import { validateMagistratesAdultCourtList } from "./json-validator.js";

const VALID_DATA = {
  document: {
    info: { start_time: "09:00:00" },
    data: {
      job: {
        printdate: "13/09/2020",
        sessions: {
          session: [
            {
              lja: "North Northumbria Magistrates' Court",
              court: "North Shields Magistrates' Court",
              room: 1,
              sstart: "09:00",
              blocks: {
                block: [
                  {
                    bstart: "09:00",
                    cases: {
                      case: [
                        {
                          caseno: "AB12345678",
                          def_name: "Smith, John"
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }
  }
};

describe("validateMagistratesAdultCourtList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateMagistratesAdultCourtList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when document is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when document.data.job is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when job.printdate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.printdate;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when job.sessions is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].lja is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].lja;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].court is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].court;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].room is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].room;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when session[0].sstart is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].sstart;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when block[0].bstart is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].blocks.block[0].bstart;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].caseno is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].caseno;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when case[0].def_name is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].def_name;
    const result = validateMagistratesAdultCourtList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
