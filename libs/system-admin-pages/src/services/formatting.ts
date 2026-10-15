const NO_DATE = "—";

// Display dates are optional on publications ingested via the inbound publication API,
// so this must render something meaningful rather than the unix epoch.
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return NO_DATE;
  }

  const date = new Date(isoString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
