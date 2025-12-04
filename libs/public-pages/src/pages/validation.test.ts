import { describe, expect, it } from "vitest";
import { en } from "./create-media-account/en.js";
import { validateForm } from "./validation.js";

describe("validateForm", () => {
  it("should return no errors for valid form data", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(0);
  });

  it("should return error for missing full name", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameBlank);
    expect(errors[0].href).toBe("#fullName");
  });

  it("should return error for full name exceeding 100 characters", () => {
    const longName = `${"a".repeat(50)} ${"b".repeat(51)}`;
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm(longName, "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameBlank);
  });

  it("should return error for full name with invalid characters", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John 123", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameBlank);
  });

  it("should return error for full name starting with whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm(" John Smith", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameWhiteSpace);
    expect(errors[0].href).toBe("#fullName");
  });

  it("should return error for full name with double whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John  Smith", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameDoubleWhiteSpace);
    expect(errors[0].href).toBe("#fullName");
  });

  it("should return error for full name without whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFullNameWithoutWhiteSpace);
    expect(errors[0].href).toBe("#fullName");
  });

  it("should return error for invalid email", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "notanemail", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmailInvalid);
    expect(errors[0].href).toBe("#email");
  });

  it("should return error for email starting with whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", " john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmailStartWithWhiteSpace);
    expect(errors[0].href).toBe("#email");
  });

  it("should return error for email with double whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john  @example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmailDoubleWhiteSpace);
    expect(errors[0].href).toBe("#email");
  });

  it("should return error for blank email", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmailBlank);
    expect(errors[0].href).toBe("#email");
  });

  it("should return error for missing employer", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmployerBlank);
    expect(errors[0].href).toBe("#employer");
  });

  it("should return error for employer exceeding 120 characters", () => {
    const longEmployer = "a".repeat(121);
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", longEmployer, "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmployerBlank);
  });

  it("should return error for employer starting with whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", " BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmployerWhiteSpace);
    expect(errors[0].href).toBe("#employer");
  });

  it("should return error for employer with double whitespace", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "BBC  News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorEmployerDoubleWhiteSpace);
    expect(errors[0].href).toBe("#employer");
  });

  it("should return error for missing file", () => {
    const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", undefined, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFileBlank);
    expect(errors[0].href).toBe("#idProof");
  });

  it("should return error for invalid file type", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "document.txt",
      encoding: "7bit",
      mimetype: "text/plain",
      size: 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFileType);
  });

  it("should return error for file too large", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 3 * 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFileSize);
  });

  it("should return error for file upload error", () => {
    const uploadError = { code: "LIMIT_FILE_SIZE" };

    const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", undefined, uploadError, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorFileSize);
  });

  it("should return error for terms not accepted", () => {
    const file: Express.Multer.File = {
      fieldname: "idProof",
      originalname: "passport.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024 * 1024,
      buffer: Buffer.from("test"),
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };

    const errors = validateForm("John Smith", "john@example.com", "BBC News", undefined, file, undefined, en);

    expect(errors).toHaveLength(1);
    expect(errors[0].text).toBe(en.errorTermsRequired);
    expect(errors[0].href).toBe("#termsAccepted");
  });

  it("should return multiple errors for multiple invalid fields", () => {
    const errors = validateForm("", "notanemail", "", undefined, undefined, undefined, en);

    expect(errors.length).toBeGreaterThan(1);
  });

  it("should accept valid file extensions (jpg, jpeg, pdf, png)", () => {
    const fileExtensions = ["jpg", "jpeg", "pdf", "png"];

    fileExtensions.forEach((ext) => {
      const file: Express.Multer.File = {
        fieldname: "idProof",
        originalname: `document.${ext}`,
        encoding: "7bit",
        mimetype: "application/octet-stream",
        size: 1024,
        buffer: Buffer.from("test"),
        stream: null as any,
        destination: "",
        filename: "",
        path: ""
      };

      const errors = validateForm("John Smith", "john@example.com", "BBC News", "on", file, undefined, en);

      expect(errors).toHaveLength(0);
    });
  });
});
