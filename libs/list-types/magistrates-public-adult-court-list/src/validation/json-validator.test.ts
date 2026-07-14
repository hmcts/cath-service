import { describe, expect, it } from "vitest";
import { validateMagistratesPublicAdultCourtList } from "./json-validator.js";

const VALID_DATA = {
  document: {
    info: { start_time: "09:00:00" },
    data: {
      job: {
        printdate: "13/09/2020",
        sessions: {
          session: [
            {
              lja: "Greater Manchester",
              court: "Manchester Magistrates' Court",
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

describe("validateMagistratesPublicAdultCourtList", () => {
  describe("valid data", () => {
    it("should return valid when all required fields are present", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept multiple sessions", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session.push({
        lja: "Another Area",
        court: "Another Court",
        room: 2,
        sstart: "10:00",
        blocks: { block: [{ bstart: "10:00", cases: { case: [{ caseno: "CD98765432", def_name: "Jones, Jane" }] } }] }
      });

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should return invalid when document is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when document.data.job is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when job.printdate is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.printdate;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when job.sessions is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when session[0].lja is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].lja;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when session[0].court is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].court;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when session[0].room is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].room;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when session[0].sstart is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].sstart;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when block[0].bstart is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].blocks.block[0].bstart;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when case[0].caseno is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].caseno;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return invalid when case[0].def_name is missing", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      delete data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].def_name;

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("date format", () => {
    it("should accept a valid DD/MM/YYYY printdate", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.printdate = "31/12/2025";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it("should reject ISO date format for printdate", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.printdate = "2020-09-13";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject printdate without leading zeros", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.printdate = "1/1/2020";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should accept a valid hh:mm sstart", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].sstart = "14:30";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it("should reject sstart without leading zero", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].sstart = "9:00";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should accept a valid hh:mm:ss start_time in info", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.info.start_time = "14:30:00";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it("should reject start_time without seconds", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.info.start_time = "09:00";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  describe("string constraints", () => {
    it("should reject lja exceeding 100 characters", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].lja = "A".repeat(101);

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject caseno shorter than 10 characters", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].caseno = "AB123";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject caseno longer than 10 characters", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].caseno = "AB1234567890";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject def_name exceeding 200 characters", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].def_name = "A".repeat(201);

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in lja", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].lja = "<script>alert(1)</script>";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in court", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].court = "<b>Manchester Court</b>";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in caseno", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].caseno = "<b>AB123456</b>";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in def_name", () => {
      // Arrange
      const data = JSON.parse(JSON.stringify(VALID_DATA));
      data.document.data.job.sessions.session[0].blocks.block[0].cases.case[0].def_name = "<img src=x onerror=alert(1)>";

      // Act
      const result = validateMagistratesPublicAdultCourtList(data);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  describe("invalid input types", () => {
    it("should reject a non-object input", () => {
      // Act
      const result = validateMagistratesPublicAdultCourtList([]);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject null", () => {
      // Act
      const result = validateMagistratesPublicAdultCourtList(null);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it("should reject a string", () => {
      // Act
      const result = validateMagistratesPublicAdultCourtList("invalid");

      // Assert
      expect(result.isValid).toBe(false);
    });
  });
});
