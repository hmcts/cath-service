export const timeFilter = (value: Date | string) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const time12Filter = (value: Date | string) => {
  if (!value) return "";
  const date = new Date(value);
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
    .toLowerCase();
};
