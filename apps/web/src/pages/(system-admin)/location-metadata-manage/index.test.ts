import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET as _GET, POST as _POST } from "./index.js";

const getHandler = _GET[_GET.length - 1];
const postHandler = _POST[_POST.length - 1];

vi.mock("@hmcts/location", () => ({
  getLocationMetadataByLocationId: vi.fn(),
  createLocationMetadata: vi.fn(),
  updateLocationMetadata: vi.fn()
}));

import { createLocationMetadata, getLocationMetadataByLocationId, updateLocationMetadata } from "@hmcts/location";

describe("location-metadata-manage page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      session: {} as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("getHandler", () => {
    it("should redirect to search page if no session data", async () => {
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should redirect to search page with Welsh param if no session data", async () => {
      req.query = { lng: "cy" };
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search?lng=cy");
    });

    it("should render manage page with existing metadata", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      (getLocationMetadataByLocationId as any).mockResolvedValue({
        cautionMessage: "Caution",
        welshCautionMessage: "Rhybudd",
        noListMessage: "No list",
        welshNoListMessage: "Dim rhestr"
      });

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          locationName: "Test Court",
          cautionMessage: "Caution",
          welshCautionMessage: "Rhybudd",
          noListMessage: "No list",
          welshNoListMessage: "Dim rhestr",
          hasExistingMetadata: true,
          errors: undefined
        })
      );
    });

    it("should render manage page without existing metadata", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          cautionMessage: "",
          welshCautionMessage: "",
          noListMessage: "",
          welshNoListMessage: "",
          hasExistingMetadata: false
        })
      );
    });

    it("should use Welsh location name when language is Welsh", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          locationName: "Llys Prawf"
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to search page if no session data", async () => {
      req.session = {} as any;

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should redirect to delete confirmation when action is delete", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { action: "delete" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-delete-confirmation");
    });

    it("should redirect to delete confirmation with Welsh param", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = { action: "delete" };

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-delete-confirmation?lng=cy");
    });

    it("should show the five agreed errors in order when no message is provided", async () => {
      // Arrange
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "",
        welshCautionMessage: "",
        noListMessage: "",
        welshNoListMessage: ""
      };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createLocationMetadata).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          errors: [
            { text: "Enter at least one message", href: "#cautionMessage" },
            { text: "Enter English caution message", href: "#cautionMessage" },
            { text: "Enter Welsh caution message", href: "#welshCautionMessage" },
            { text: "Enter English no list message", href: "#noListMessage" },
            { text: "Enter Welsh no list message", href: "#welshNoListMessage" }
          ],
          fieldErrors: {
            cautionMessage: { text: "Enter English caution message" },
            welshCautionMessage: { text: "Enter Welsh caution message" },
            noListMessage: { text: "Enter English no list message" },
            welshNoListMessage: { text: "Enter Welsh no list message" }
          }
        })
      );
    });

    it("should treat whitespace-only messages as empty on update", async () => {
      // Arrange
      req.session = { locationMetadata: { locationId: 123, locationName: "Test Court", locationWelshName: "Llys Prawf" } } as any;
      req.body = { action: "update", cautionMessage: "   ", welshCautionMessage: "\n", noListMessage: "", welshNoListMessage: "" };
      (getLocationMetadataByLocationId as any).mockResolvedValue({ cautionMessage: "Existing" });

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateLocationMetadata).not.toHaveBeenCalled();
      const renderData = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderData.errors).toHaveLength(5);
      expect(Object.keys(renderData.fieldErrors)).toEqual(["cautionMessage", "welshCautionMessage", "noListMessage", "welshNoListMessage"]);
    });

    it("should show the five errors in Welsh when the language is Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.session = { locationMetadata: { locationId: 123, locationName: "Test Court", locationWelshName: "Llys Prawf" } } as any;
      req.body = { action: "create" };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      const renderData = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderData.errors.map((error: { text: string }) => error.text)).toEqual([
        cy.atLeastOneMessageRequired,
        cy.cautionMessageRequired,
        cy.welshCautionMessageRequired,
        cy.noListMessageRequired,
        cy.welshNoListMessageRequired
      ]);
      expect(renderData.fieldErrors.welshNoListMessage).toEqual({ text: cy.welshNoListMessageRequired });
    });

    it("should not show required errors when only one message is filled in", async () => {
      // Arrange
      req.session = { locationMetadata: { locationId: 123, locationName: "Test Court", locationWelshName: "Llys Prawf" } } as any;
      req.body = { action: "create", welshNoListMessage: "Dim rhestr" };
      (createLocationMetadata as any).mockResolvedValue(undefined);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(res.render).not.toHaveBeenCalled();
      expect(createLocationMetadata).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success");
    });

    it("should report a disallowed tag error on every field that has one, inline and in the summary", async () => {
      // Arrange
      req.session = { locationMetadata: { locationId: 123, locationName: "Test Court", locationWelshName: "Llys Prawf" } } as any;
      req.body = { action: "create", cautionMessage: "<script>x</script>", noListMessage: "Fine", welshNoListMessage: "<iframe></iframe>" };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      const renderData = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderData.errors.map((error: { href: string }) => error.href)).toEqual(["#cautionMessage", "#welshNoListMessage"]);
      expect(Object.keys(renderData.fieldErrors)).toEqual(["cautionMessage", "welshNoListMessage"]);
      expect(renderData.fieldErrors.cautionMessage.text).toContain(en.cautionMessageLabel);
    });

    it.each([
      ["cautionMessage", "English caution message"],
      ["welshCautionMessage", "Welsh caution message"],
      ["noListMessage", "English no list message"],
      ["welshNoListMessage", "Welsh no list message"]
    ])("should reject %s when it contains a tag outside the allowlist", async (field, label) => {
      // Arrange
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        [field]: '<img src="x" onerror="alert(1)">'
      };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createLocationMetadata).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          errors: [{ text: `${label} contains HTML tags which cannot be used: img`, href: `#${field}` }],
          fieldErrors: { [field]: { text: `${label} contains HTML tags which cannot be used: img` } }
        })
      );
    });

    it("should not update metadata when a message contains a disallowed tag", async () => {
      // Arrange
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "update",
        cautionMessage: "<script>alert(1)</script>"
      };
      (getLocationMetadataByLocationId as any).mockResolvedValue({ cautionMessage: "Existing" });

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(updateLocationMetadata).not.toHaveBeenCalled();
    });

    it("should store allowed formatting exactly as authored", async () => {
      // Arrange
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "<p><strong>Court closed</strong></p><p>Reopens Monday</p>"
      };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createLocationMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          cautionMessage: "<p><strong>Court closed</strong></p><p>Reopens Monday</p>"
        })
      );
    });

    it("should accept a message using angle brackets as comparison operators", async () => {
      // Arrange
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "Hearings start at < 10am and finish > 4pm"
      };
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      // Act
      await postHandler(req as Request, res as Response);

      // Assert
      expect(createLocationMetadata).toHaveBeenCalled();
    });

    it("should create metadata and redirect to success page", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "Test caution"
      };
      (createLocationMetadata as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(createLocationMetadata).toHaveBeenCalledWith({
        locationId: 123,
        cautionMessage: "Test caution",
        welshCautionMessage: undefined,
        noListMessage: undefined,
        welshNoListMessage: undefined
      });
      expect((req.session as any).locationMetadata.operation).toBe("created");
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success");
    });

    it("should update metadata and redirect to success page", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "update",
        cautionMessage: "Updated caution"
      };
      (updateLocationMetadata as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(updateLocationMetadata).toHaveBeenCalledWith(123, {
        cautionMessage: "Updated caution",
        welshCautionMessage: undefined,
        noListMessage: undefined,
        welshNoListMessage: undefined
      });
      expect((req.session as any).locationMetadata.operation).toBe("updated");
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success");
    });

    it("should redirect to success page with Welsh param", async () => {
      req.query = { lng: "cy" };
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "Test caution"
      };
      (createLocationMetadata as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-success?lng=cy");
    });

    it("should show error when create fails", async () => {
      req.session = {
        locationMetadata: {
          locationId: 123,
          locationName: "Test Court",
          locationWelshName: "Llys Prawf"
        }
      } as any;
      req.body = {
        action: "create",
        cautionMessage: "Test caution"
      };
      (createLocationMetadata as any).mockRejectedValue(new Error("Database error"));
      (getLocationMetadataByLocationId as any).mockResolvedValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "location-metadata-manage/index",
        expect.objectContaining({
          errors: [{ text: "Database error", href: "#cautionMessage" }],
          fieldErrors: {}
        })
      );
    });
  });
});
