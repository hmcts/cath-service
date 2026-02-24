/**
 * Common CSS styles for PDF templates across all list types.
 * These styles follow GOV.UK design patterns for consistent PDF output.
 */
export const PDF_BASE_STYLES = `
    * {
      box-sizing: border-box;
      font-family: "GDS Transport", arial, sans-serif;
    }
    body {
      font-size: 14px;
      line-height: 1.4;
      color: #0b0c0c;
      margin: 0;
      padding: 20px;
    }
    h1, h2, h3, h4 {
      margin-top: 0;
      font-weight: 700;
    }
    h1 { font-size: 32px; margin-bottom: 20px; }
    h2 { font-size: 24px; margin-bottom: 15px; margin-top: 30px; }
    h3 { font-size: 18px; margin-bottom: 10px; }
    h4 { font-size: 16px; margin-bottom: 8px; margin-top: 15px; }
    p { margin: 0 0 15px 0; }
    a { color: #1d70b8; }
    .header-section {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0b0c0c;
    }
    .bold { font-weight: 700; }
    .header-date { margin-bottom: 5px; }
    .address { margin-bottom: 15px; }
    .location { margin-bottom: 15px; }
    .location p { margin-bottom: 0; }
    .info-box {
      background-color: #f3f2f1;
      padding: 15px;
      margin-bottom: 20px;
    }
    .info-box p:last-child { margin-bottom: 0; }
    .info-box p { white-space: pre-line; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #b1b4b6;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f3f2f1;
      font-weight: 700;
    }
    .no-wrap { white-space: nowrap; }
    .footer {
      margin-top: 30px;
      font-size: 12px;
    }
    .footer p { margin-bottom: 10px; }
    .caution-box {
      background-color: #f3f2f1;
      padding: 15px;
      margin-top: 15px;
    }
    .caution-box p {
      margin-bottom: 10px;
      color: #0b0c0c;
    }
    .caution-box p:last-child { margin-bottom: 0; }
`;

/**
 * Additional styles for civil-and-family list type (court sections, restrictions, etc.)
 */
export const PDF_CIVIL_FAMILY_STYLES = `
    .court-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .court-room-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-heading {
      background-color: #f3f2f1;
      padding: 10px 15px;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 700;
    }
    .restriction-row td {
      background-color: #fff7e6;
      font-style: italic;
    }
`;
