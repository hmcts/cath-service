export const cy = {
  pageTitle: "Rheoli tanysgrifiadau",
  tableHeadings: {
    listType: "Math o restr",
    public: "Cyhoeddus",
    private: "Preifat",
    classified: "Cyfrinachol",
    unselected: "Heb ddewis",
    sensitivity: "Sensitifrwydd"
  },
  sensitivityOptions: {
    public: "Cyhoeddus",
    private: "Preifat",
    classified: "Cyfrinachol",
    unselected: "Heb ddewis"
  },
  saveButton: "Cadw tanysgrifiadau",
  nextButton: "Nesaf",
  previousButton: "Blaenorol",
  back: "Yn ôl",
  pageOf: (current: number, total: number) => `Tudalen ${current} o ${total}`
};
