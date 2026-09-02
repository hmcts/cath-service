import type { Alignment, Border, Fill, Font } from "exceljs";

const THIN_BORDER: Partial<Border> = { style: "thin" };

export const HEADER_FONT: Partial<Font> = { bold: true, size: 11, name: "Arial" };

export const HEADER_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" }
};

export const HEADER_ALIGNMENT: Partial<Alignment> = { vertical: "middle", horizontal: "left" };

export const DATA_FONT: Partial<Font> = { size: 11, name: "Arial" };

export const DATA_ALIGNMENT: Partial<Alignment> = { vertical: "top", horizontal: "left", wrapText: true };

export const CELL_BORDER = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER
};
