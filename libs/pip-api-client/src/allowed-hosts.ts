export function getAllowedPipHosts(): string[] {
  return parseAllowedHosts(process.env.PIP_API_ALLOWED_HOSTS);
}

export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function parseAllowedHosts(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return [
    ...new Set(
      value
        .split(",")
        .map(normaliseHost)
        .filter((host) => host !== "")
    )
  ];
}
