export const cy = {
  pageTitle: "Rheoli metadata lleoliad",
  heading: "Rheoli metadata lleoliad ar gyfer",
  cautionMessageLabel: "Neges rhybudd Saesneg",
  welshCautionMessageLabel: "Neges rhybudd Cymraeg",
  noListMessageLabel: "Neges dim rhestr Saesneg",
  welshNoListMessageLabel: "Neges dim rhestr Cymraeg",
  createButtonText: "Creu",
  updateButtonText: "Diweddaru",
  deleteButtonText: "Dileu",
  errorSummaryTitle: "Mae yna broblem",
  atLeastOneMessageRequired: "Rhowch o leiaf un neges",
  cautionMessageRequired: "Enter English caution message",
  welshCautionMessageRequired: "Enter Welsh caution message",
  noListMessageRequired: "Enter English no list message",
  welshNoListMessageRequired: "Enter Welsh no list message",
  htmlTagsNotAllowed: (fieldLabel: string, tags: string[]) => `Mae ${fieldLabel} yn cynnwys tagiau HTML na ellir eu defnyddio: ${tags.join(", ")}`,
  locationNotFoundInSession: "Heb ddod o hyd i leoliad. Chwiliwch eto."
};
