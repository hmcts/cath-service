export interface ErrorItem {
  href: string;
}

export function validateThirdPartyUserName(name: string | undefined): ErrorItem | null {
  if (!name || name.trim() === "") {
    return {
      href: "#name"
    };
  }

  if (name.trim().length > 255) {
    return {
      href: "#name"
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
