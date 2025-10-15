import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface Translations {
  [locale: string]: any;
}

export async function loadTranslationsFromMultiplePaths(paths: string[]): Promise<Translations> {
  const allTranslations: Translations = {};
  const supportedLocales = ["en", "cy"];

  // Initialize empty objects for each locale
  for (const locale of supportedLocales) {
    allTranslations[locale] = {};
  }

  // Load and merge translations from each path
  for (const localePath of paths) {
    const translations = await loadTranslations(localePath);

    for (const locale of supportedLocales) {
      if (translations[locale]) {
        allTranslations[locale] = {
          ...allTranslations[locale],
          ...translations[locale]
        };
      }
    }
  }

  return allTranslations;
}

export async function loadTranslations(localesPath: string): Promise<Translations> {
  const translations: Translations = {};
  const supportedLocales = ["en", "cy"];

  // Initialize empty objects for each locale
  for (const locale of supportedLocales) {
    translations[locale] = {};
  }

  // First, load any files that export both en and cy (e.g., shared.ts)
  const sharedFiles = ["shared"];
  for (const sharedFile of sharedFiles) {
    const tsFilePath = join(localesPath, `${sharedFile}.ts`);
    const jsFilePath = join(localesPath, `${sharedFile}.js`);
    const filePath = existsSync(jsFilePath) ? jsFilePath : tsFilePath;

    if (existsSync(filePath)) {
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const content = await import(fileUrl);

        for (const locale of supportedLocales) {
          if (content[locale]) {
            translations[locale] = { ...translations[locale], ...content[locale] };
          }
        }
      } catch (error) {
        console.error(`Failed to load shared translations from ${sharedFile}:`, error);
      }
    }
  }

  // Then load individual locale files (en.ts, cy.ts) which can override component translations
  for (const locale of supportedLocales) {
    const tsFilePath = join(localesPath, `${locale}.ts`);
    const jsFilePath = join(localesPath, `${locale}.js`);
    const filePath = existsSync(jsFilePath) ? jsFilePath : tsFilePath;

    if (existsSync(filePath)) {
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const langContent = await import(fileUrl);
        translations[locale] = { ...translations[locale], ...(langContent.content || langContent.default || {}) };
      } catch (error) {
        console.error(`Failed to load translations for ${locale}:`, error);
      }
    } else {
      console.warn(`Translation file not found for ${locale}: ${tsFilePath}`);
    }
  }

  return translations;
}

export function getTranslation(translations: Translations, key: string, locale: string, fallbackLocale = "en"): string {
  const keys = key.split(".");

  // Try to get the value from the requested locale
  let value = translations[locale];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // If we can't find it in the requested locale and it's not the fallback, try the fallback
      if (locale !== fallbackLocale && translations[fallbackLocale]) {
        return getTranslation(translations, key, fallbackLocale, fallbackLocale);
      }
      return key;
    }
  }

  if (typeof value === "string") {
    return value;
  }

  return key;
}
