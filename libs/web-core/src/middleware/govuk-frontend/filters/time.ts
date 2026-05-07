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
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: true,
    ...(date.getMinutes() !== 0 && { minute: "2-digit" })
  };
  return date.toLocaleTimeString("en-US", options).replace(/\s/g, "").toLowerCase();
};
