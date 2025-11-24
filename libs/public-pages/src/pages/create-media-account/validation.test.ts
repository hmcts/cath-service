import { describe, expect, it } from "vitest";
import type { FileData, FormData } from "./validation.js";
import { validateEmail, validateEmployer, validateFile, validateForm, validateFullName, validateTerms } from "./validation.js";

describe("validateFullName", () => {
  it("should return error when fullName is undefined", () => {
    const result = validateFullName(undefined, "Enter your full name");
    expect(result).toEqual({
      field: "fullName",
      message: "Enter your full name",
      href: "#fullName"
    });
  });

  it("should return error when fullName is empty", () => {
    const result = validateFullName("", "Enter your full name");
    expect(result).toEqual({
      field: "fullName",
      message: "Enter your full name",
      href: "#fullName"
    });
  });

  it("should return error when fullName is only whitespace", () => {
    const result = validateFullName("   ", "Enter your full name");
    expect(result).toEqual({
      field: "fullName",
      message: "Enter your full name",
      href: "#fullName"
    });
  });

  it("should return error when fullName exceeds 100 characters", () => {
    const result = validateFullName("a".repeat(101), "Enter your full name");
    expect(result).toEqual({
      field: "fullName",
      message: "Full name must be 100 characters or less",
      href: "#fullName"
    });
  });

  it("should return null for valid fullName", () => {
    const result = validateFullName("John Smith", "Enter your full name");
    expect(result).toBeNull();
  });
});

describe("validateEmail", () => {
  it("should return error when email is undefined", () => {
    const result = validateEmail(undefined, "Enter an email address");
    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
  });

  it("should return error when email is empty", () => {
    const result = validateEmail("", "Enter an email address");
    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
  });

  it("should return error when email format is invalid", () => {
    const result = validateEmail("notanemail", "Enter an email address");
    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
  });

  it("should return error when email has no TLD", () => {
    const result = validateEmail("test@example", "Enter an email address");
    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
  });

  it("should return error when email exceeds maximum length", () => {
    const longEmail = "a".repeat(250) + "@example.com"; // Total > 254 chars
    const result = validateEmail(longEmail, "Enter an email address");
    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
  });

  it("should return null for valid email", () => {
    const result = validateEmail("test@example.com", "Enter an email address");
    expect(result).toBeNull();
  });

  it("should return null for valid email with plus sign", () => {
    const result = validateEmail("test+tag@example.com", "Enter an email address");
    expect(result).toBeNull();
  });

  it("should return null for valid email with dots", () => {
    const result = validateEmail("first.last@example.co.uk", "Enter an email address");
    expect(result).toBeNull();
  });

  it("should handle email with special characters in local part", () => {
    const result = validateEmail("test.name+tag@example.com", "Enter an email address");
    expect(result).toBeNull();
  });

  it("should protect against ReDoS with long invalid input", () => {
    const start = Date.now();
    const maliciousInput = "a".repeat(100) + "@";
    const result = validateEmail(maliciousInput, "Enter an email address");
    const duration = Date.now() - start;

    expect(result).toEqual({
      field: "email",
      message: "Enter an email address",
      href: "#email"
    });
    // Should complete in under 100ms (ReDoS would take much longer)
    expect(duration).toBeLessThan(100);
  });
});

describe("validateEmployer", () => {
  it("should return error when employer is undefined", () => {
    const result = validateEmployer(undefined, "Enter your employer");
    expect(result).toEqual({
      field: "employer",
      message: "Enter your employer",
      href: "#employer"
    });
  });

  it("should return error when employer is empty", () => {
    const result = validateEmployer("", "Enter your employer");
    expect(result).toEqual({
      field: "employer",
      message: "Enter your employer",
      href: "#employer"
    });
  });

  it("should return error when employer exceeds 120 characters", () => {
    const result = validateEmployer("a".repeat(121), "Enter your employer");
    expect(result).toEqual({
      field: "employer",
      message: "Employer must be 120 characters or less",
      href: "#employer"
    });
  });

  it("should return null for valid employer", () => {
    const result = validateEmployer("BBC News", "Enter your employer");
    expect(result).toBeNull();
  });
});

describe("validateFile", () => {
  it("should return error when file is undefined", () => {
    const result = validateFile(undefined, "Select a file", "Invalid type", "File too large");
    expect(result).toEqual({
      field: "idProof",
      message: "Select a file",
      href: "#idProof"
    });
  });

  it("should return error when file type is invalid", () => {
    const file: FileData = {
      mimetype: "image/gif",
      size: 1000000,
      originalname: "test.gif"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toEqual({
      field: "idProof",
      message: "Invalid type",
      href: "#idProof"
    });
  });

  it("should return error when file extension is invalid", () => {
    const file: FileData = {
      mimetype: "image/jpeg",
      size: 1000000,
      originalname: "test.txt"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toEqual({
      field: "idProof",
      message: "Invalid type",
      href: "#idProof"
    });
  });

  it("should return error when file size exceeds 2MB", () => {
    const file: FileData = {
      mimetype: "image/jpeg",
      size: 3000000,
      originalname: "test.jpg"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toEqual({
      field: "idProof",
      message: "File too large",
      href: "#idProof"
    });
  });

  it("should return null for valid jpg file", () => {
    const file: FileData = {
      mimetype: "image/jpeg",
      size: 1000000,
      originalname: "test.jpg"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toBeNull();
  });

  it("should return null for valid png file", () => {
    const file: FileData = {
      mimetype: "image/png",
      size: 1000000,
      originalname: "test.png"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toBeNull();
  });

  it("should return null for valid pdf file", () => {
    const file: FileData = {
      mimetype: "application/pdf",
      size: 1000000,
      originalname: "test.pdf"
    };
    const result = validateFile(file, "Select a file", "Invalid type", "File too large");
    expect(result).toBeNull();
  });
});

describe("validateTerms", () => {
  it("should return error when terms not accepted", () => {
    const result = validateTerms(false, "Accept terms");
    expect(result).toEqual({
      field: "termsAccepted",
      message: "Accept terms",
      href: "#termsAccepted"
    });
  });

  it("should return error when terms is undefined", () => {
    const result = validateTerms(undefined, "Accept terms");
    expect(result).toEqual({
      field: "termsAccepted",
      message: "Accept terms",
      href: "#termsAccepted"
    });
  });

  it("should return null when terms accepted", () => {
    const result = validateTerms(true, "Accept terms");
    expect(result).toBeNull();
  });
});

describe("validateForm", () => {
  const validFormData: FormData = {
    fullName: "John Smith",
    email: "john@example.com",
    employer: "BBC News",
    termsAccepted: true
  };

  const validFile: FileData = {
    mimetype: "image/jpeg",
    size: 1000000,
    originalname: "test.jpg"
  };

  const errorMessages = {
    fullName: "Enter your full name",
    email: "Enter an email address",
    employer: "Enter your employer",
    fileRequired: "Select a file",
    fileType: "Invalid type",
    fileSize: "File too large",
    terms: "Accept terms"
  };

  it("should return no errors for valid form", () => {
    const result = validateForm(validFormData, validFile, errorMessages);
    expect(result).toEqual([]);
  });

  it("should return all errors for completely invalid form", () => {
    const invalidFormData: FormData = {
      fullName: "",
      email: "",
      employer: "",
      termsAccepted: false
    };
    const result = validateForm(invalidFormData, undefined, errorMessages);
    expect(result).toHaveLength(5);
  });

  it("should return multiple specific errors", () => {
    const partialFormData: FormData = {
      fullName: "",
      email: "john@example.com",
      employer: "BBC News",
      termsAccepted: true
    };
    const result = validateForm(partialFormData, validFile, errorMessages);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe("fullName");
  });
});
