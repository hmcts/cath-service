import { getLocationWithDetails } from "@hmcts/location";

// Resolves the comma-separated region name(s) for a location, in the requested locale.
export async function resolveRegionName(locationId: string, locale: string): Promise<string> {
  const location = await getLocationWithDetails(Number.parseInt(locationId, 10));
  return (location?.regions ?? [])
    .map((region) => (locale === "cy" && region.welshName ? region.welshName : region.name))
    .filter((name) => name && name.length > 0)
    .join(", ");
}
