import { createUtiacJrDailyHearingListPdfGenerator } from "@hmcts/utiac-jr-leeds-daily-hearing-list";

type GeneratorFn = ReturnType<typeof createUtiacJrDailyHearingListPdfGenerator>;

const LIST_TITLE = "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List";

export function generateUtiacJrManchesterDailyHearingListPdf(options: Parameters<GeneratorFn>[0]): ReturnType<GeneratorFn> {
  return createUtiacJrDailyHearingListPdfGenerator(LIST_TITLE)(options);
}
