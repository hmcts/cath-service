export const SJP_PRESS_LIST_PDF_STYLES = `
    .defendant-card {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #b1b4b6;
      page-break-inside: avoid;
    }
    .defendant-card:last-child {
      border-bottom: none;
    }
    .summary-list {
      margin: 0 0 10px 0;
      padding: 0;
      list-style: none;
    }
    .summary-list dt {
      font-weight: 700;
      display: inline;
    }
    .summary-list dt::after {
      content: ": ";
    }
    .summary-list dd {
      display: inline;
      margin: 0;
    }
    .summary-list .row {
      margin-bottom: 5px;
    }
    .offence-section {
      margin-top: 10px;
      padding-left: 15px;
      border-left: 3px solid #b1b4b6;
    }
    .offence-item {
      margin-bottom: 10px;
    }
    .restriction-tag {
      font-weight: 700;
      color: #d4351c;
    }
`;
