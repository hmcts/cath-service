import { describe, expect, it } from "vitest";
import { detectFlatFileExtension, withFlatFileExtension } from "./flat-file-type.js";

function zipWithEntry(entryName: string): Buffer {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), Buffer.from(entryName, "latin1")]);
}

describe("detectFlatFileExtension", () => {
  it("should detect each file type the new reader serves from its signature", () => {
    // Act & Assert
    expect(detectFlatFileExtension(Buffer.from("%PDF-1.7\n..."))).toBe(".pdf");
    expect(detectFlatFileExtension(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]))).toBe(".doc");
    expect(detectFlatFileExtension(zipWithEntry("word/document.xml"))).toBe(".docx");
    expect(detectFlatFileExtension(zipWithEntry("xl/workbook.xml"))).toBe(".xlsx");
    expect(detectFlatFileExtension(Buffer.from("﻿  <!DOCTYPE html><html></html>"))).toBe(".html");
    expect(detectFlatFileExtension(Buffer.from("Case,Court,Time\nT1,Leeds,10:00"))).toBe(".csv");
  });

  it("should return null for anything it cannot identify", () => {
    // Act & Assert
    expect(detectFlatFileExtension(zipWithEntry("other/file.txt"))).toBeNull();
    expect(detectFlatFileExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]))).toBeNull();
    expect(detectFlatFileExtension(Buffer.from("just some text"))).toBeNull();
  });
});

describe("withFlatFileExtension", () => {
  it("should keep a source id that already has a served extension", () => {
    // Act & Assert
    expect(withFlatFileExtension("hearing-list.PDF", "artefact-1", ".pdf")).toBe("hearing-list.PDF");
  });

  it("should append the detected extension to the publisher's id", () => {
    // Act & Assert
    expect(withFlatFileExtension("SNL-12345", "artefact-1", ".docx")).toBe("SNL-12345.docx");
  });

  it("should fall back to the artefact id when legacy has no source id", () => {
    // Act & Assert
    expect(withFlatFileExtension(null, "artefact-1", ".csv")).toBe("artefact-1.csv");
  });
});
