export function formatPublicationDate(dateString: string, locale: string): string {
  const date = new Date(dateString);

  if (locale === "cy") {
    return date.toLocaleDateString("cy-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
