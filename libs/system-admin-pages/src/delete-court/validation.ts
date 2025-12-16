export interface ErrorItem {
  text: string;
  href: string;
}

export function validateLocationSelected(locationId: string | undefined): ErrorItem | null {
  if (!locationId || locationId.trim() === "") {
    return {
      text: "Enter a court or tribunal name",
      href: "#court-search"
    };
  }

  return null;
}

export function validateRadioSelection(value: string | undefined): ErrorItem | null {
  if (!value) {
    return {
      text: "Select yes or no to continue",
      href: "#confirm-delete"
    };
  }

  return null;
}
