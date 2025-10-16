import { getAllLocations } from "@hmcts/location";

export function initSearchAutocomplete() {
  const locationInput = document.getElementById("location") as HTMLInputElement;
  if (!locationInput) return;

  const language = (document.documentElement.lang || "en") as "en" | "cy";
  const locations = getAllLocations(language);

  const datalist = document.createElement("datalist");
  datalist.id = "location-suggestions";

  for (const location of locations) {
    const option = document.createElement("option");
    option.value = language === "cy" ? location.welshName : location.name;
    option.setAttribute("data-location-id", location.locationId.toString());
    datalist.appendChild(option);
  }

  locationInput.setAttribute("list", "location-suggestions");
  locationInput.setAttribute("autocomplete", "off");
  locationInput.parentElement?.appendChild(datalist);

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = "locationId";
  hiddenInput.id = "locationId";
  locationInput.parentElement?.appendChild(hiddenInput);

  const preselectedLocationId = locationInput.getAttribute("data-location-id");
  if (preselectedLocationId) {
    hiddenInput.value = preselectedLocationId;
  }

  locationInput.removeAttribute("name");

  locationInput.addEventListener("input", () => {
    const inputValue = locationInput.value.trim();

    const matchingLocation = locations.find((loc) => {
      const name = language === "cy" ? loc.welshName : loc.name;
      return name.toLowerCase() === inputValue.toLowerCase();
    });

    if (matchingLocation) {
      hiddenInput.value = matchingLocation.locationId.toString();
    } else {
      hiddenInput.value = "";
    }
  });

  locationInput.addEventListener("change", () => {
    const inputValue = locationInput.value.trim();

    const matchingLocation = locations.find((loc) => {
      const name = language === "cy" ? loc.welshName : loc.name;
      return name.toLowerCase() === inputValue.toLowerCase();
    });

    if (matchingLocation) {
      hiddenInput.value = matchingLocation.locationId.toString();
    } else {
      hiddenInput.value = "";
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initSearchAutocomplete();
  });
}
