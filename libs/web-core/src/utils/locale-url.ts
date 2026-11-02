const LOCALE_PARAM = "lng";
const DEFAULT_LOCALE = "en";

// Sets the locale on a relative URL that may already carry a query string. Any existing lng
// parameter is removed first, comparing decoded keys because the query parser decodes them too
// (l%6Eg=en is read as lng). For the default locale lng is dropped rather than set, so URLs stay
// clean and the session locale applies. The URL is split as a string, not re-serialised through
// URL, so the path and remaining parameters are kept byte-for-byte.
export function withLocaleParam(url: string, locale: string): string {
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);

  const params = query.split("&").filter((param) => param !== "" && !isLocaleParam(param));
  const allParams = locale === DEFAULT_LOCALE ? params : [...params, `${LOCALE_PARAM}=${encodeURIComponent(locale)}`];

  return allParams.length > 0 ? `${path}?${allParams.join("&")}${hash}` : `${path}${hash}`;
}

function isLocaleParam(param: string): boolean {
  const rawKey = param.split("=", 1)[0];
  try {
    return decodeURIComponent(rawKey.replaceAll("+", " ")) === LOCALE_PARAM;
  } catch {
    return false;
  }
}
