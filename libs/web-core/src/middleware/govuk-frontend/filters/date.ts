export const dateFilter = (value: Date | string, format?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (format === "short") {
    return date.toLocaleDateString("en-GB");
  }
  if (format === "compact") {
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};
