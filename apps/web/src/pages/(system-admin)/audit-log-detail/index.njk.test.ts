import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/audit-log-detail/index.njk";

const log = {
  userId: "user-123",
  userEmail: "user@example.com",
  userRole: "SYSTEM_ADMIN",
  userProvenance: "PI_AAD",
  timestamp: "01/01/2026 10:30:00",
  action: "VIEW_AUDIT_LOG",
  details: "Some details"
};

const buildData = (content: typeof en) => ({
  title: content.detailTitle,
  log,
  userIdLabel: content.detailLabels.userId,
  emailLabel: content.detailLabels.email,
  roleLabel: content.detailLabels.role,
  provenanceLabel: content.detailLabels.provenance,
  actionLabel: content.detailLabels.action,
  detailsLabel: content.detailLabels.details,
  timestampLabel: content.detailLabels.timestamp,
  backToListText: content.backToList,
  backToTopText: content.backToTop
});

describe("audit-log-detail template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading, detail table and navigation links", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.detailTitle);

      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(en.detailLabels.userId);
      expect(tableText).toContain(log.userId);
      expect(tableText).toContain(en.detailLabels.email);
      expect(tableText).toContain(log.userEmail);
      expect(tableText).toContain(en.detailLabels.role);
      expect(tableText).toContain(log.userRole);
      expect(tableText).toContain(en.detailLabels.provenance);
      expect(tableText).toContain(log.userProvenance);
      expect(tableText).toContain(en.detailLabels.timestamp);
      expect(tableText).toContain(log.timestamp);
      expect(tableText).toContain(en.detailLabels.action);
      expect(tableText).toContain(log.action);
      expect(tableText).toContain(en.detailLabels.details);
      expect(tableText).toContain(log.details);

      expect($('a[href="/audit-log-list"]').text()).toContain(en.backToList);
      expect($('a[href="#top"]').text()).toContain(en.backToTop);

      assertNoErrors($);
    });

    it("should render N/A when details are missing", () => {
      // Arrange
      const data = buildData(en);
      data.log = { ...log, details: "" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-table").text()).toContain("N/A");
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, labels and navigation links", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.detailTitle);

      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(cy.detailLabels.userId);
      expect(tableText).toContain(cy.detailLabels.provenance);
      expect(tableText).toContain(cy.detailLabels.role);

      expect($('a[href="/audit-log-list"]').text()).toContain(cy.backToList);
      expect($('a[href="#top"]').text()).toContain(cy.backToTop);
    });
  });
});
