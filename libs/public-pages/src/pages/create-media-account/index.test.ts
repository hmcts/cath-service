import { writeFile } from "node:fs/promises";
import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("node:fs/promises");
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    mediaApplication: {
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe("create-media-account GET", () => {
  it("should render the form with empty data", async () => {
    const req = {} as any;
    const res = {
      render: vi.fn()
    } as any;

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith("create-media-account/index", {
      en: expect.any(Object),
      cy: expect.any(Object),
      data: {},
      errors: null
    });
  });
});

describe("create-media-account POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return validation errors when form is invalid", async () => {
    const req = {
      body: {
        fullName: "",
        email: "",
        employer: "",
        termsAccepted: false
      },
      file: undefined
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "create-media-account/index",
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ href: "#fullName" }),
          expect.objectContaining({ href: "#email" }),
          expect.objectContaining({ href: "#employer" }),
          expect.objectContaining({ href: "#idProof" }),
          expect.objectContaining({ href: "#termsAccepted" })
        ])
      })
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should retain form values on validation error", async () => {
    const req = {
      body: {
        fullName: "John Smith",
        email: "invalid-email",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: undefined
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "create-media-account/index",
      expect.objectContaining({
        data: {
          fullName: "John Smith",
          email: "invalid-email",
          employer: "BBC News",
          termsAccepted: true
        },
        errors: expect.any(Array)
      })
    );
  });

  it("should validate email format", async () => {
    const req = {
      body: {
        fullName: "John Smith",
        email: "notanemail",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/jpeg",
        size: 1000000,
        originalname: "test.jpg",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "create-media-account/index",
      expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ href: "#email" })])
      })
    );
  });

  it("should reject files over 2MB", async () => {
    const req = {
      body: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/jpeg",
        size: 3000000, // 3MB
        originalname: "test.jpg",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "create-media-account/index",
      expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ href: "#idProof" })])
      })
    );
  });

  it("should reject invalid file types", async () => {
    const req = {
      body: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/gif",
        size: 1000000,
        originalname: "test.gif",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "create-media-account/index",
      expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ href: "#idProof" })])
      })
    );
  });

  it("should create database record and save file on successful submission", async () => {
    const mockCreate = vi.mocked(prisma.mediaApplication.create);
    const mockUpdate = vi.mocked(prisma.mediaApplication.update);
    const mockWriteFile = vi.mocked(writeFile);

    mockCreate.mockResolvedValue({
      id: "test-id-123",
      fullName: "John Smith",
      email: "john@example.com",
      employer: "BBC News",
      fileName: "",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    const req = {
      body: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/jpeg",
        size: 1000000,
        originalname: "test.jpg",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        fileName: "",
        status: "PENDING"
      }
    });

    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("test-id-123.jpg"), expect.any(Buffer));

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "test-id-123" },
      data: { fileName: "test-id-123.jpg" }
    });

    expect(res.redirect).toHaveBeenCalledWith(303, "/account-request-submitted");
  });

  it("should handle pdf files correctly", async () => {
    const mockCreate = vi.mocked(prisma.mediaApplication.create);
    const mockUpdate = vi.mocked(prisma.mediaApplication.update);
    const mockWriteFile = vi.mocked(writeFile);

    mockCreate.mockResolvedValue({
      id: "test-id-456",
      fullName: "Jane Doe",
      email: "jane@example.com",
      employer: "The Guardian",
      fileName: "",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    const req = {
      body: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        employer: "The Guardian",
        termsAccepted: "on"
      },
      file: {
        mimetype: "application/pdf",
        size: 1000000,
        originalname: "document.pdf",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("test-id-456.pdf"), expect.any(Buffer));

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "test-id-456" },
      data: { fileName: "test-id-456.pdf" }
    });

    expect(res.redirect).toHaveBeenCalledWith(303, "/account-request-submitted");
  });

  it("should normalize email to lowercase", async () => {
    const mockCreate = vi.mocked(prisma.mediaApplication.create);
    mockCreate.mockResolvedValue({
      id: "test-id-789",
      fullName: "Test User",
      email: "test@example.com",
      employer: "Test Corp",
      fileName: "",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    const req = {
      body: {
        fullName: "Test User",
        email: "TEST@EXAMPLE.COM",
        employer: "Test Corp",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/png",
        size: 1000000,
        originalname: "test.png",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "test@example.com"
      })
    });
  });

  it("should handle database errors gracefully", async () => {
    const mockCreate = vi.mocked(prisma.mediaApplication.create);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreate.mockRejectedValue(new Error("Database error"));

    const req = {
      body: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/jpeg",
        size: 1000000,
        originalname: "test.jpg",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis()
    } as any;

    await POST(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating media application:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/500", {
      en: { title: "Server Error" },
      cy: { title: "Gwall Gweinydd" }
    });
    expect(res.redirect).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should trim whitespace from form fields", async () => {
    const mockCreate = vi.mocked(prisma.mediaApplication.create);
    mockCreate.mockResolvedValue({
      id: "test-id-999",
      fullName: "John Smith",
      email: "john@example.com",
      employer: "BBC News",
      fileName: "",
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    });

    const req = {
      body: {
        fullName: "  John Smith  ",
        email: "  JOHN@EXAMPLE.COM  ",
        employer: "  BBC News  ",
        termsAccepted: "on"
      },
      file: {
        mimetype: "image/jpeg",
        size: 1000000,
        originalname: "test.jpg",
        buffer: Buffer.from("test")
      }
    } as any;

    const res = {
      render: vi.fn(),
      redirect: vi.fn()
    } as any;

    await POST(req, res);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        fullName: "John Smith",
        email: "john@example.com",
        employer: "BBC News",
        fileName: "",
        status: "PENDING"
      }
    });
  });
});
