export interface ErrorItem {
  href: string;
}

export function validateLocationSelected(locationId: string | undefined): ErrorItem | null {
  if (!locationId || locationId.trim() === "") {
    return {
      href: "#court-search"
    };
  }

  return null;
}

export function validateRadioSelection(value: string | undefined): ErrorItem | null {
  if (!value) {
    return {
      href: "#confirm-delete"
    };
  }

  return null;
}
